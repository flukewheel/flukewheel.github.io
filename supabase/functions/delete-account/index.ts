import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const allowedOrigins = new Set([
  'https://flukewheel.github.io',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:4173',
])
const requestSchema = z.strictObject({ confirm_email: z.email().max(320) })

function key(variable: string, legacy: string): string | undefined {
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

function respond(request: Request, status: number, code: string, message: string) {
  return Response.json({ code, message }, { status, headers: { ...headers(request), 'Cache-Control': 'no-store' } })
}

async function boundedJson(request: Request): Promise<unknown> {
  if (!request.body) throw new Error('Missing body')
  const reader = request.body.getReader()
  const parts: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.length
    if (length > 1024) { await reader.cancel(); throw new Error('Body too large') }
    parts.push(value)
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const part of parts) { bytes.set(part, offset); offset += part.length }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(request) })
  if (request.method !== 'POST') return respond(request, 405, 'INVALID_INPUT', 'Use POST to delete an account.')
  if (request.headers.get('origin') && !allowedOrigins.has(request.headers.get('origin')!)) return respond(request, 403, 'FORBIDDEN', 'This origin is not allowed.')
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return respond(request, 401, 'AUTH_REQUIRED', 'Sign in to delete your account.')

  let input: z.infer<typeof requestSchema>
  try { input = requestSchema.parse(await boundedJson(request)) }
  catch { return respond(request, 400, 'INVALID_INPUT', 'Enter your account email to confirm deletion.') }

  const url = Deno.env.get('SUPABASE_URL')
  const publishableKey = key('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')
  const secretKey = key('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !publishableKey || !secretKey) return respond(request, 503, 'INTERNAL_ERROR', 'Account deletion is unavailable.')

  const auth = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: { user }, error: authError } = await auth.auth.getUser(token)
  if (authError || !user || user.is_anonymous) return respond(request, 401, 'AUTH_REQUIRED', 'Sign in to delete your account.')
  if (!user.email || input.confirm_email.trim().toLowerCase() !== user.email.toLowerCase()) {
    return respond(request, 400, 'INVALID_INPUT', 'The confirmation email does not match this account.')
  }

  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: isAdmin, error: roleError } = await admin.rpc('catalogue_admin', { p_actor_id: user.id })
  if (roleError) return respond(request, 503, 'INTERNAL_ERROR', 'Account deletion is unavailable.')
  if (isAdmin) return respond(request, 409, 'ADMIN_ACCOUNT', 'Transfer administrator access before deleting this account.')

  // The avatar processor stores flat objects below the user's UUID. Storage
  // objects must be removed through Storage before Auth can delete their owner.
  for (let batch = 0; batch < 100; batch++) {
    const { data: objects, error: listError } = await admin.storage.from('avatars').list(user.id, { limit: 100 })
    if (listError) return respond(request, 503, 'STORAGE_ERROR', 'Account files could not be checked. Please try again.')
    if (!objects?.length) break
    if (objects.some((item) => !item.id)) return respond(request, 503, 'STORAGE_ERROR', 'Account files could not be removed. Please contact the site owner.')
    const { error: removeError } = await admin.storage.from('avatars').remove(objects.map((item) => `${user.id}/${item.name}`))
    if (removeError) return respond(request, 503, 'STORAGE_ERROR', 'Account files could not be removed. Please try again.')
    if (batch === 99) return respond(request, 503, 'STORAGE_ERROR', 'Account has too many files to delete automatically. Please contact the site owner.')
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) return respond(request, 503, 'DELETE_FAILED', 'Your account could not be deleted. Please try again.')
  return respond(request, 200, 'OK', 'Your account was deleted.')
})
