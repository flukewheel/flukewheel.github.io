import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { normaliseSubmissionUrl } from '../_shared/submission-url.ts'

const allowedOrigins = new Set([
  'https://flukewheel.github.io',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:4173',
])
const submissionSchema = z.strictObject({
  original_url: z.string().min(8).max(2048),
  suggested_categories: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(64)).max(8),
  description: z.string().trim().max(1000).nullable(),
  request_id: z.string().uuid(),
})

function headersFor(request: Request): HeadersInit {
  const origin = request.headers.get('origin')
  return origin && allowedOrigins.has(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' }
    : {}
}

function reply(request: Request, status: number, code: string, message: string, requestId = crypto.randomUUID(), extra: Record<string, unknown> = {}) {
  return Response.json({ code, message, request_id: requestId, ...extra }, { status, headers: { ...headersFor(request), 'Cache-Control': 'no-store' } })
}

function defaultKey(variable: string, legacy: string): string | undefined {
  try {
    const keys = JSON.parse(Deno.env.get(variable) ?? '{}') as Record<string, string>
    return keys.default || Deno.env.get(legacy)
  } catch { return Deno.env.get(legacy) }
}

async function boundedJson(request: Request): Promise<unknown> {
  if (!request.body) throw new Error('A submission is required.')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.length
    if (length > 8192) { await reader.cancel(); throw new Error('The submission is too large.') }
    chunks.push(value)
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  try { return JSON.parse(new TextDecoder().decode(bytes)) }
  catch { throw new Error('The submission must be valid JSON.') }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headersFor(request) })
  if (request.method !== 'POST') return reply(request, 405, 'INVALID_INPUT', 'Use POST to suggest a website.')
  if (request.headers.get('origin') && !allowedOrigins.has(request.headers.get('origin')!)) return reply(request, 403, 'FORBIDDEN', 'This origin is not allowed.')

  let parsed: z.infer<typeof submissionSchema>
  let normalised: string
  try {
    const result = submissionSchema.safeParse(await boundedJson(request))
    if (!result.success) throw new Error('Enter a website URL and select up to eight categories.')
    parsed = result.data
    normalised = normaliseSubmissionUrl(parsed.original_url)
  } catch (cause) {
    return reply(request, 400, 'INVALID_INPUT', cause instanceof Error ? cause.message : 'Invalid submission.')
  }

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = defaultKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')
  const serviceKey = defaultKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceKey) return reply(request, 503, 'INTERNAL_ERROR', 'Submissions are unavailable.', parsed.request_id)

  let submitterId: string | null = null
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (token && token !== anonKey) {
    const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: { user } } = await authClient.auth.getUser(token)
    if (user && !user.is_anonymous) submitterId = user.id
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await admin.rpc('submit_website_intake', {
    p_request_id: parsed.request_id,
    p_submitter_id: submitterId,
    p_raw_url: parsed.original_url,
    p_normalised_url: normalised,
    p_suggested_categories: [...new Set(parsed.suggested_categories)],
    p_description: parsed.description || null,
  })
  if (error || !data?.[0]) return reply(request, 500, 'INTERNAL_ERROR', 'The suggestion could not be saved. Please try again.', parsed.request_id)
  const result = data[0] as { submission_id: string | null; result: string }
  if (result.result === 'duplicate') return reply(request, 409, 'CONFLICT', 'This website has already been suggested or added.', parsed.request_id)
  if (result.result === 'rate_limited') return reply(request, 429, 'RATE_LIMITED', 'The suggestion limit for the past 24 hours has been reached. Please try again later.', parsed.request_id)
  return Response.json({ request_id: parsed.request_id, submission_id: result.submission_id, status: 'pending' }, { status: 202, headers: { ...headersFor(request), 'Cache-Control': 'no-store' } })
})
