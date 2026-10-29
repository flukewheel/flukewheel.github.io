import { createClient } from '@supabase/supabase-js'
import { ImageMagick, initializeImageMagick, MagickFormat } from '@imagemagick/magick-wasm'

const MAX_INPUT = 1_048_576
const MAX_DIMENSION = 4096
const MAX_PIXELS = 16_000_000
const OUTPUT_DIMENSION = 512
const allowedOrigins = new Set((Deno.env.get('AVATAR_ALLOWED_ORIGINS') ?? '').split(',').map((x) => x.trim()).filter(Boolean))

const wasm = await Deno.readFile(new URL('magick.wasm', import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.42')))
await initializeImageMagick(wasm)

function headersFor(request: Request): HeadersInit {
  const origin = request.headers.get('origin')
  return origin && allowedOrigins.has(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' }
    : {}
}

function reply(request: Request, status: number, code: string, extra: Record<string, unknown> = {}) {
  return Response.json({ code, ...extra }, { status, headers: { ...headersFor(request), 'Cache-Control': 'no-store' } })
}

function detectedFormat(bytes: Uint8Array): 'jpeg' | 'png' | 'webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg'
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return 'png'
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'webp'
  return null
}

function defaultKey(variable: string, legacy: string): string | undefined {
  try {
    const keys = JSON.parse(Deno.env.get(variable) ?? '{}') as Record<string, string>
    return keys.default || Deno.env.get(legacy)
  } catch {
    return Deno.env.get(legacy)
  }
}

async function boundedBody(request: Request, maximum: number): Promise<Uint8Array | null> {
  if (!request.body) return null
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.length
    if (length > maximum) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headersFor(request) })
  if (request.method !== 'POST') return reply(request, 405, 'METHOD_NOT_ALLOWED')
  if (request.headers.get('origin') && !allowedOrigins.has(request.headers.get('origin')!)) return reply(request, 403, 'FORBIDDEN_ORIGIN')
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return reply(request, 401, 'AUTH_REQUIRED')
  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = defaultKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')
  const serviceKey = defaultKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceKey) return reply(request, 503, 'NOT_CONFIGURED')

  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: { user }, error: authError } = await authClient.auth.getUser(token)
  if (authError || !user || user.is_anonymous) return reply(request, 401, 'AUTH_REQUIRED')

  const length = Number(request.headers.get('content-length') ?? '0')
  if (length > MAX_INPUT + 16_384) return reply(request, 413, 'IMAGE_TOO_LARGE')
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) return reply(request, 400, 'INVALID_INPUT')

  const body = await boundedBody(request, MAX_INPUT + 16_384)
  if (!body) return reply(request, 413, 'IMAGE_TOO_LARGE')
  let file: FormDataEntryValue | null
  try {
    const formRequest = new Request(request.url, { method: 'POST', headers: { 'content-type': request.headers.get('content-type')! }, body })
    file = (await formRequest.formData()).get('file')
  }
  catch { return reply(request, 400, 'INVALID_INPUT') }
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_INPUT) return reply(request, 400, 'INVALID_IMAGE')
  const bytes = new Uint8Array(await file.arrayBuffer())
  const format = detectedFormat(bytes)
  if (!format || file.type !== `image/${format}`) return reply(request, 400, 'INVALID_IMAGE')

  let output: Uint8Array
  try {
    output = ImageMagick.read(bytes, (image) => {
      const expected = { jpeg: MagickFormat.Jpeg, png: MagickFormat.Png, webp: MagickFormat.WebP }[format]
      if (image.format !== expected || image.width < 1 || image.height < 1 || image.width > MAX_DIMENSION || image.height > MAX_DIMENSION || image.width * image.height > MAX_PIXELS) throw new Error('invalid dimensions or format')
      image.autoOrient()
      const scale = Math.min(1, OUTPUT_DIMENSION / Math.max(image.width, image.height))
      if (scale < 1) image.resize(Math.max(1, Math.round(image.width * scale)), Math.max(1, Math.round(image.height * scale)))
      image.quality = 82
      return image.write(MagickFormat.WebP, (data) => new Uint8Array(data))
    })
  } catch (error) {
    console.error('Avatar conversion failed:', error instanceof Error ? error.message : 'unknown error')
    return reply(request, 400, 'INVALID_IMAGE')
  }
  if (output.length === 0 || output.length > MAX_INPUT) return reply(request, 400, 'INVALID_IMAGE')

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: oldProfile, error: readError } = await admin.from('profiles').select('avatar_path').eq('id', user.id).maybeSingle()
  if (readError) return reply(request, 500, 'STORAGE_ERROR')
  const path = `${user.id}/${crypto.randomUUID()}.webp`
  const { error: uploadError } = await admin.storage.from('avatars').upload(path, output, { contentType: 'image/webp', upsert: false, cacheControl: '3600' })
  if (uploadError) return reply(request, 500, 'STORAGE_ERROR')
  const { error: profileError } = await admin.from('profiles').upsert({ id: user.id, avatar_path: path }, { onConflict: 'id' })
  if (profileError) {
    await admin.storage.from('avatars').remove([path])
    return reply(request, 500, 'STORAGE_ERROR')
  }
  if (oldProfile?.avatar_path?.startsWith(`${user.id}/`) && oldProfile.avatar_path !== path) {
    await admin.storage.from('avatars').remove([oldProfile.avatar_path])
  }
  return reply(request, 200, 'OK', { path })
})
