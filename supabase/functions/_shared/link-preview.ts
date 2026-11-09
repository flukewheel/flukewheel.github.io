import { normaliseSubmissionUrl } from './submission-url.ts'

const maxHtmlBytes = 1_048_576
const maxImageBytes = 2_097_152
type ResolveDns = (hostname: string, recordType: 'A' | 'AAAA') => Promise<string[]>

export function publicAddress(address: string): boolean {
  if (address.includes(':')) {
    // Only global-unicast IPv6 is eligible. This excludes loopback, ULA,
    // link-local and IPv4-mapped addresses.
    return /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:0?db8:/i.test(address)
  }
  const octets = address.split('.').map(Number)
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [a, b, c] = octets
  return a > 0 && a < 224 && a !== 10 && a !== 127
    && !(a === 100 && b >= 64 && b <= 127)
    && !(a === 169 && b === 254)
    && !(a === 172 && b >= 16 && b <= 31)
    && !(a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99) || (b === 0 && c === 2)))
    && !(a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100)))
    && !(a === 203 && b === 0 && c === 113)
  }

async function safeUrl(raw: string, resolveDns: ResolveDns): Promise<URL> {
  const url = new URL(normaliseSubmissionUrl(raw))
  // DNS is checked before every request, including redirects and image hosts.
  // Fetch is never permitted to follow redirects itself.
  const results = await Promise.allSettled([
    resolveDns(url.hostname, 'A'), resolveDns(url.hostname, 'AAAA'),
  ])
  const addresses = results.flatMap((result) => result.status === 'fulfilled' ? result.value : [])
  if (!addresses.length || addresses.some((address) => !publicAddress(address))) throw new Error('Non-public preview destination')
  return url
}

async function safeFetch(raw: string, signal: AbortSignal, resolveDns: ResolveDns): Promise<{ response: Response; url: URL }> {
  let next = raw
  for (let redirects = 0; redirects <= 3; redirects++) {
    const url = await safeUrl(next, resolveDns)
    const response = await fetch(url, {
      redirect: 'manual', signal,
      headers: { Accept: 'text/html,image/gif,image/webp,image/png,image/jpeg,*/*;q=0.8', 'User-Agent': 'FlukewheelLinkPreview/1.0' },
    })
    if (![301, 302, 303, 307, 308].includes(response.status)) return { response, url }
    const location = response.headers.get('location')
    await response.body?.cancel()
    if (!location) throw new Error('Preview redirect has no destination')
    next = new URL(location, url).href
  }
  throw new Error('Too many preview redirects')
}

async function boundedBody(response: Response, max: number): Promise<Uint8Array> {
  const length = Number(response.headers.get('content-length'))
  if (length > max || !response.body) throw new Error('Preview is too large')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > max) { await reader.cancel(); throw new Error('Preview is too large') }
    chunks.push(value)
  }
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength }
  return body
}

async function htmlHead(response: Response): Promise<string> {
  if (!response.body) throw new Error('Empty preview page')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let html = ''
  let bytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) return html + decoder.decode()
    bytes += value.byteLength
    if (bytes > maxHtmlBytes) { await reader.cancel(); throw new Error('Preview page head is too large') }
    html += decoder.decode(value, { stream: true })
    if (/<\/head\s*>|<body\b/i.test(html)) { await reader.cancel(); return html }
  }
}

function decodeEntities(value: string): string {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#(\d+)|#x([0-9a-f]+));/gi, (entity, decimal, hex) => {
    if (decimal || hex) {
      const point = Number.parseInt(decimal || hex, hex ? 16 : 10)
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity
    }
    return ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' } as Record<string, string>)[entity.toLowerCase()] ?? entity
  })
}

export function previewImageFromHtml(html: string, pageUrl: string): string | null {
  const head = html.split(/<\/head\s*>|<body\b/i, 1)[0]
  const candidates: Record<string, string> = {}
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes: Record<string, string> = {}
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attributes[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '')
    }
    const key = (attributes.property ?? attributes.name ?? '').toLowerCase()
    if (key && attributes.content && !(key in candidates)) candidates[key] = attributes.content
  }
  const candidate = candidates['og:image:secure_url'] ?? candidates['og:image']
    ?? candidates['twitter:image'] ?? candidates['twitter:image:src']
  if (!candidate) return null
  try { return new URL(candidate, pageUrl).href } catch { return null }
}

export function imageType(bytes: Uint8Array): { mime: string; extension: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: 'image/jpeg', extension: 'jpg' }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mime: 'image/png', extension: 'png' }
  if (new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP') return { mime: 'image/webp', extension: 'webp' }
  const gifHeader = new TextDecoder().decode(bytes.slice(0, 6))
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') return { mime: 'image/gif', extension: 'gif' }
  return null
}

export async function fetchLinkPreview(
  rawUrl: string,
  resolveDns: ResolveDns = (hostname, recordType) => Deno.resolveDns(hostname, recordType),
): Promise<{ bytes: Uint8Array; mime: string; extension: string } | null> {
  const signal = AbortSignal.timeout(12_000)
  const { response: page, url: pageUrl } = await safeFetch(rawUrl, signal, resolveDns)
  if (!page.ok || !page.headers.get('content-type')?.toLowerCase().includes('text/html')) return null
  const html = await htmlHead(page)
  const imageUrl = previewImageFromHtml(html, pageUrl.href)
  if (!imageUrl) return null
  const { response: image } = await safeFetch(imageUrl, signal, resolveDns)
  if (!image.ok) return null
  const bytes = await boundedBody(image, maxImageBytes)
  const type = imageType(bytes)
  return type ? { bytes, ...type } : null
}
