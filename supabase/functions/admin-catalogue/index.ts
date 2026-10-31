import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const allowedOrigins = new Set([
  'https://flukewheel.github.io',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:4173',
])
const requestSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('status') }),
  z.strictObject({ action: z.literal('queue') }),
  z.strictObject({ action: z.literal('categories') }),
  z.strictObject({ action: z.literal('reports') }),
  z.strictObject({ action: z.literal('rechecks') }),
  z.strictObject({ action: z.literal('review_reports'), website_id: z.string().uuid(), note: z.string().trim().min(1).max(1000) }),
  z.strictObject({
    action: z.literal('complete_recheck'), website_id: z.string().uuid(),
    outcome: z.enum(['allowed', 'blocked', 'needs_review', 'failed']),
    checked_url: z.string().url().max(2048).nullable(),
    note: z.string().trim().min(10).max(1000),
  }),
  z.strictObject({
    action: z.literal('catalogue'), search: z.string().max(100),
    after_title: z.string().max(160).nullable().default(null),
    after_id: z.string().uuid().nullable().default(null),
  }),
  z.strictObject({
    action: z.literal('edit_website'),
    website_id: z.string().uuid(),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(1000),
    thumbnail_path: z.string().max(512).nullable(),
    category_ids: z.array(z.string().uuid()).min(1).max(8),
    active: z.boolean(),
    embedding_status: z.enum(['unknown', 'allowed', 'blocked', 'needs_review']),
    note: z.string().trim().min(1).max(1000),
  }),
  z.strictObject({
    action: z.literal('delete_website'),
    website_id: z.string().uuid(),
    confirm_title: z.string().min(1).max(160),
  }),
  z.strictObject({
    action: z.literal('save_category'),
    category_id: z.string().uuid().nullable(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(64),
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(300),
    active: z.boolean(),
    display_order: z.number().int().min(-10000).max(10000),
  }),
  z.strictObject({
    action: z.literal('review'),
    submission_id: z.string().uuid(),
    decision: z.enum(['approve', 'reject']),
    title: z.string().trim().max(160).nullable(),
    description: z.string().trim().max(1000).nullable(),
    category_ids: z.array(z.string().uuid()).max(8),
    note: z.string().trim().max(1000).nullable(),
  }),
])

function headersFor(request: Request): HeadersInit {
  const origin = request.headers.get('origin')
  return origin && allowedOrigins.has(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' }
    : {}
}
function reply(request: Request, status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  return Response.json({ code, message, request_id: crypto.randomUUID(), ...extra }, { status, headers: { ...headersFor(request), 'Cache-Control': 'no-store' } })
}
function defaultKey(variable: string, legacy: string): string | undefined {
  try {
    const keys = JSON.parse(Deno.env.get(variable) ?? '{}') as Record<string, string>
    return keys.default || Deno.env.get(legacy)
  } catch { return Deno.env.get(legacy) }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headersFor(request) })
  if (request.method !== 'POST') return reply(request, 405, 'INVALID_INPUT', 'Use POST for administration.')
  if (request.headers.get('origin') && !allowedOrigins.has(request.headers.get('origin')!)) return reply(request, 403, 'FORBIDDEN', 'This origin is not allowed.')
  if (Number(request.headers.get('content-length') ?? 0) > 8192) return reply(request, 413, 'INVALID_INPUT', 'The request is too large.')

  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return reply(request, 401, 'AUTH_REQUIRED', 'Sign in to use administration.')
  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = defaultKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')
  const serviceKey = defaultKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceKey) return reply(request, 503, 'INTERNAL_ERROR', 'Administration is unavailable.')
  const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: { user }, error: authError } = await auth.auth.getUser(token)
  if (authError || !user || user.is_anonymous) return reply(request, 401, 'AUTH_REQUIRED', 'Sign in to use administration.')

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: allowed, error: roleError } = await admin.rpc('catalogue_admin', { p_actor_id: user.id })
  if (roleError) return reply(request, 503, 'INTERNAL_ERROR', 'Administration is unavailable.')
  if (!allowed) return reply(request, 403, 'FORBIDDEN', 'Administrator access is required.')

  let parsed: z.infer<typeof requestSchema>
  try {
    const result = requestSchema.safeParse(await request.json())
    if (!result.success) throw new Error()
    parsed = result.data
  } catch { return reply(request, 400, 'INVALID_INPUT', 'The administration request is invalid.') }

  if (parsed.action === 'status') {
    return Response.json({ administrator: true }, { headers: { ...headersFor(request), 'Cache-Control': 'no-store' } })
  }

  if (parsed.action === 'queue') {
    const { data, error } = await admin.rpc('admin_submission_queue', { p_actor_id: user.id })
    if (error) return reply(request, 500, 'INTERNAL_ERROR', 'The review queue could not be loaded.')
    return Response.json({ submissions: data }, { headers: { ...headersFor(request), 'Cache-Control': 'no-store' } })
  }

  if (parsed.action === 'categories') {
    const { data, error } = await admin.rpc('admin_category_list', { p_actor_id: user.id })
    if (error) return reply(request, 500, 'INTERNAL_ERROR', 'Categories could not be loaded.')
    return Response.json({ categories: data }, { headers: { ...headersFor(request), 'Cache-Control': 'no-store' } })
  }
  if (parsed.action === 'reports') {
    const { data, error } = await admin.rpc('admin_report_queue', { p_actor_id: user.id })
    if (error) return reply(request, 500, 'INTERNAL_ERROR', 'Reports could not be loaded.')
    return Response.json({ reports: data }, { headers: { ...headersFor(request), 'Cache-Control': 'no-store' } })
  }
  if (parsed.action === 'rechecks') {
    const { data, error } = await admin.rpc('admin_recheck_queue', { p_actor_id: user.id })
    if (error) return reply(request, 500, 'INTERNAL_ERROR', 'Rechecks could not be loaded.')
    return Response.json({ rechecks: data }, { headers: { ...headersFor(request), 'Cache-Control': 'no-store' } })
  }
  if (parsed.action === 'review_reports') {
    const { data, error } = await admin.rpc('review_reports', { p_actor_id: user.id, p_website_id: parsed.website_id, p_note: parsed.note })
    if (error) return reply(request, error.code === 'P0002' ? 404 : 400, 'INVALID_INPUT', 'Report review could not be saved.')
    return Response.json({ website_id: data }, { headers: { ...headersFor(request), 'Cache-Control': 'no-store' } })
  }
  if (parsed.action === 'complete_recheck') {
    const { data, error } = await admin.rpc('complete_recheck', {
      p_actor_id: user.id, p_website_id: parsed.website_id,
      p_outcome: parsed.outcome, p_checked_url: parsed.checked_url, p_note: parsed.note,
    })
    if (error) return reply(request, error.code === 'P0002' ? 404 : 400, 'INVALID_INPUT', 'Recheck could not be saved.')
    return Response.json({ website_id: data }, { headers: { ...headersFor(request), 'Cache-Control': 'no-store' } })
  }
  if (parsed.action === 'catalogue') {
    const { data, error } = await admin.rpc('admin_catalogue_page', {
      p_actor_id: user.id, p_search: parsed.search,
      p_after_title: parsed.after_title, p_after_id: parsed.after_id,
    })
    if (error) return reply(request, 500, 'INTERNAL_ERROR', 'Catalogue could not be loaded.')
    return Response.json({ websites: data }, { headers: { ...headersFor(request), 'Cache-Control': 'no-store' } })
  }
  if (parsed.action === 'edit_website') {
    const { data, error } = await admin.rpc('manage_website', {
      p_actor_id: user.id, p_website_id: parsed.website_id, p_title: parsed.title,
      p_description: parsed.description, p_thumbnail_path: parsed.thumbnail_path,
      p_category_ids: parsed.category_ids, p_active: parsed.active,
      p_embedding_status: parsed.embedding_status, p_note: parsed.note,
    })
    if (error) return reply(request, error.code === '22023' ? 400 : error.code === 'P0002' ? 404 : 500, 'INVALID_INPUT', 'The catalogue change could not be saved.')
    return Response.json({ website_id: data }, { headers: { ...headersFor(request), 'Cache-Control': 'no-store' } })
  }
  if (parsed.action === 'delete_website') {
    const { data, error } = await admin.rpc('delete_website_permanently', {
      p_actor_id: user.id,
      p_website_id: parsed.website_id,
      p_confirm_title: parsed.confirm_title,
    })
    if (error) {
      const status = error.code === '22023' ? 400 : error.code === 'P0002' ? 404 : 500
      return reply(request, status, status === 404 ? 'NOT_FOUND' : status === 400 ? 'INVALID_INPUT' : 'INTERNAL_ERROR',
        status === 400 ? 'The confirmation title no longer matches this website.' : status === 404 ? 'This website is no longer in the catalogue.' : 'The website could not be deleted.')
    }
    return Response.json(data, { headers: { ...headersFor(request), 'Cache-Control': 'no-store' } })
  }
  if (parsed.action === 'save_category') {
    const { data, error } = await admin.rpc('manage_category', {
      p_actor_id: user.id, p_category_id: parsed.category_id, p_slug: parsed.slug,
      p_name: parsed.name, p_description: parsed.description, p_active: parsed.active,
      p_display_order: parsed.display_order,
    })
    if (error) return reply(request, error.code === '23505' ? 409 : 400, error.code === '23505' ? 'CONFLICT' : 'INVALID_INPUT', error.code === '23505' ? 'That category slug is already in use.' : 'The category could not be saved.')
    return Response.json({ category_id: data }, { headers: { ...headersFor(request), 'Cache-Control': 'no-store' } })
  }

  const { data, error } = await admin.rpc('review_submission', {
    p_actor_id: user.id,
    p_submission_id: parsed.submission_id,
    p_decision: parsed.decision,
    p_title: parsed.title,
    p_description: parsed.description,
    p_category_ids: parsed.category_ids,
    p_note: parsed.note,
  })
  if (error) {
    const status = error.code === '22023' ? 400 : error.code === 'P0002' ? 404 : error.code === '23505' ? 409 : 500
    const code = status === 400 ? 'INVALID_INPUT' : status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'INTERNAL_ERROR'
    return reply(request, status, code, status === 400 ? error.message : 'The review could not be saved. Please refresh and try again.')
  }
  return Response.json({ status: data?.[0]?.review_status, website_id: data?.[0]?.website_id ?? null }, { headers: { ...headersFor(request), 'Cache-Control': 'no-store' } })
})
