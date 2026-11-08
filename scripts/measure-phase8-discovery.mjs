import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'

const envPath = process.argv[2] ?? 'apps/web/.env.hosted.local'
const runs = Number(process.argv[3] ?? 25)
if (!Number.isInteger(runs) || runs < 5 || runs > 60) throw new Error('Choose 5–60 runs.')
const env = Object.fromEntries(readFileSync(envPath, 'utf8').split(/\r?\n/)
  .filter((line) => /^[A-Z_]+=/.test(line))
  .map((line) => {
    const at = line.indexOf('=')
    return [line.slice(0, at), line.slice(at + 1).replace(/^"|"$/g, '')]
  }))
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key) throw new Error('Public Supabase configuration is missing.')

const durations = []
for (let index = -2; index < runs; index += 1) {
  const began = performance.now()
  const response = await fetch(`${url}/functions/v1/bump-website`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ category_id: null, recent_ids: [], request_id: crypto.randomUUID() }),
  })
  const body = await response.json()
  if (response.status !== 200 || !body.website?.id) {
    throw new Error(`Discovery failed with HTTP ${response.status} (${body.code ?? 'unknown'}).`)
  }
  if (index >= 0) durations.push(Math.round(performance.now() - began))
}
const sorted = [...durations].sort((a, b) => a - b)
console.log(JSON.stringify({
  endpoint: new URL(url).origin,
  warmups: 2,
  measuredRequests: runs,
  minMs: sorted[0],
  medianMs: sorted[Math.ceil(runs * 0.5) - 1],
  p95Ms: sorted[Math.ceil(runs * 0.95) - 1],
  maxMs: sorted.at(-1),
}, null, 2))
