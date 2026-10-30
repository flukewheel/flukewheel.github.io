import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const input = process.argv[2] ?? 'supabase/catalogue/2026-10-30-requested.txt'
const output = process.argv[3] ?? 'test-results/catalogue-url-audit.json'
const urls = (await readFile(input, 'utf8')).split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
const results = Array(urls.length)
let next = 0

async function readStart(response, limit = 32_768) {
  const reader = response.body?.getReader()
  if (!reader) return ''
  const chunks = []
  let length = 0
  try {
    while (length < limit) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      length += value.length
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, limit))
}

async function worker() {
  while (next < urls.length) {
    const index = next++
    const url = urls[index]
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(18_000),
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; FlukewheelCatalogueCheck/1.0)',
          accept: 'text/html,application/pdf,*/*',
        },
      })
      const contentType = response.headers.get('content-type') ?? ''
      const start = contentType.includes('html') ? await readStart(response) : ''
      const title = start.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() ?? ''
      results[index] = {
        url,
        finalUrl: response.url,
        status: response.status,
        contentType,
        title,
        xFrameOptions: response.headers.get('x-frame-options') ?? '',
        frameAncestors: response.headers.get('content-security-policy')?.match(/(?:^|;)\s*frame-ancestors\s+([^;]+)/i)?.[1] ?? '',
      }
    } catch (error) {
      results[index] = { url, error: String(error?.cause?.code ?? error?.message ?? error) }
    }
  }
}

await Promise.all(Array.from({ length: 8 }, worker))
await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, JSON.stringify(results, null, 2) + '\n')
console.log(JSON.stringify({ total: urls.length, ok: results.filter((r) => r.status >= 200 && r.status < 400).length, failed: results.filter((r) => !r.status || r.status >= 400).length, output }))
