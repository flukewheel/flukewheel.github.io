import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const allowedOrigins = new Set([
  'https://flukewheel.github.io',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:4173',
])
const requestSchema = z.strictObject({
  category_id: z.uuid().nullable(),
  recent_ids: z.array(z.uuid()).max(5000),
  request_id: z.uuid(),
})

function key(variable: string, legacy: string) {
  try {
    const keys = JSON.parse(Deno.env.get(variable) ?? '{}') as Record<string, string>
    return keys.default || Deno.env.get(legacy)
  } catch { return Deno.env.get(legacy) }
}

function headers(request: Request): HeadersInit {
  const origin = request.headers.get('origin')
  return origin && allowedOrigins.has(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' }
    : {}
}

function respond(request: Request, status: number, body: Record<string, unknown>, extraHeaders: HeadersInit = {}) {
  return Response.json(body, { status, headers: { ...headers(request), 'Cache-Control': 'no-store', ...extraHeaders } })
}

async function boundedJson(request: Request) {
  if (!request.body) throw new Error('A request body is required.')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.length
    if (length > 210_000) { await reader.cancel(); throw new Error('The request is too large.') }
    chunks.push(value)
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(request) })
  const requestId = crypto.randomUUID()
  if (request.method !== 'POST') return respond(request, 405, { code: 'INVALID_INPUT', request_id: requestId })
  if (request.headers.get('origin') && !allowedOrigins.has(request.headers.get('origin')!)) {
    return respond(request, 403, { code: 'FORBIDDEN', request_id: requestId })
  }

  let input: z.infer<typeof requestSchema>
  try {
    input = requestSchema.parse(await boundedJson(request))
  } catch {
    return respond(request, 400, { code: 'INVALID_INPUT', request_id: requestId })
  }

  const url = Deno.env.get('SUPABASE_URL')
  const publishableKey = key('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')
  const secretKey = key('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !publishableKey || !secretKey) {
    return respond(request, 503, { code: 'INTERNAL_ERROR', request_id: input.request_id })
  }

  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  let userId: string | null = null
  if (token && token !== publishableKey && token !== Deno.env.get('SUPABASE_ANON_KEY') && !token.startsWith('sb_publishable_')) {
    const auth = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: { user }, error } = await auth.auth.getUser(token)
    if (error || !user || user.is_anonymous) return respond(request, 401, { code: 'AUTH_REQUIRED', request_id: input.request_id })
    userId = user.id
  }

  const scoped = createClient(url, publishableKey, {
    global: token && userId ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })

  let selectionId: string | null = null
  let websiteId: string | null = null
  let relaxed = false
  if (userId) {
    const previous = await admin.from('bump_history').select('id,website_id,exclusions_relaxed')
      .eq('user_id', userId).eq('request_id', input.request_id).maybeSingle()
    if (previous.error) return respond(request, 503, { code: 'INTERNAL_ERROR', request_id: input.request_id })
    selectionId = previous.data?.id ?? null
    websiteId = previous.data?.website_id ?? null
    relaxed = previous.data?.exclusions_relaxed ?? false
  }

  if (!websiteId) {
    const { data, error } = await scoped.rpc('select_bump_website', {
      p_category_id: input.category_id,
      p_recent_ids: input.recent_ids,
      p_current_id: input.recent_ids.at(-1) ?? null,
      p_request_id: input.request_id,
      p_seed: Math.random(),
    })
    if (error) {
      if (error.message.includes('RATE_LIMITED')) {
        return respond(request, 429, { code: 'RATE_LIMITED', request_id: input.request_id }, { 'Retry-After': '60' })
      }
      const invalid = error.message.includes('INVALID_CATEGORY') || error.message.includes('INVALID_INPUT')
      return respond(request, invalid ? 400 : 503, { code: invalid ? 'INVALID_INPUT' : 'INTERNAL_ERROR', request_id: input.request_id })
    }
    const picked = data?.[0] as { website_id: string; exclusions_relaxed: boolean } | undefined
    if (!picked) return respond(request, 404, { code: 'EMPTY_CATALOGUE', request_id: input.request_id })
    websiteId = picked.website_id
    relaxed = picked.exclusions_relaxed
    if (userId) {
      const { error: insertError } = await admin.from('bump_history').upsert({
        user_id: userId, website_id: websiteId, source: 'bump', request_id: input.request_id,
        exclusions_relaxed: relaxed,
      }, { onConflict: 'user_id,request_id', ignoreDuplicates: true })
      if (insertError) return respond(request, 503, { code: 'INTERNAL_ERROR', request_id: input.request_id })
      const saved = await admin.from('bump_history').select('id,website_id,exclusions_relaxed')
        .eq('user_id', userId).eq('request_id', input.request_id).single()
      if (saved.error) return respond(request, 503, { code: 'INTERNAL_ERROR', request_id: input.request_id })
      selectionId = saved.data.id
      websiteId = saved.data.website_id
      relaxed = saved.data.exclusions_relaxed
    }
  }

  const website = await scoped.from('websites')
    .select('id,title,description,original_url,thumbnail_path')
    .eq('id', websiteId).maybeSingle()
  if (website.error) return respond(request, 503, { code: 'INTERNAL_ERROR', request_id: input.request_id })
  if (!website.data) return respond(request, 404, { code: 'EMPTY_CATALOGUE', request_id: input.request_id })
  const categories = await scoped.from('website_categories').select('category_id').eq('website_id', websiteId)
  if (categories.error) return respond(request, 503, { code: 'INTERNAL_ERROR', request_id: input.request_id })
  const item = website.data
  return respond(request, 200, {
    request_id: input.request_id,
    selection_id: selectionId ?? crypto.randomUUID(),
    website: {
      id: item.id, title: item.title, description: item.description,
      original_url: item.original_url,
      thumbnail_url: item.thumbnail_path ? admin.storage.from('thumbnails').getPublicUrl(item.thumbnail_path).data.publicUrl : null,
      category_ids: (categories.data ?? []).map((row) => row.category_id),
      delivery_mode: 'inline',
    },
    exclusions_relaxed: relaxed,
  })
})
