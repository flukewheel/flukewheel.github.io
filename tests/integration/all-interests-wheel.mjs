import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const output = execSync('npx supabase status --output json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const status = JSON.parse(output.slice(output.indexOf('{'), output.lastIndexOf('}') + 1))
assert.equal(status.API_URL, 'http://127.0.0.1:54421', 'Use the local Flukewheel stack only.')
const service = createClient(status.API_URL, status.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const { data, error } = await service.from('websites').select('id,original_url')
  .eq('approval_status', 'approved').eq('active', true).eq('embedding_status', 'allowed')
  .order('id').limit(1000)
if (error) throw error
const ids = (data ?? []).filter(({ original_url }) => !/^https?:\/\/flukewheel\.github\.io(?::\d+)?(?:\/|$)/i.test(original_url)).map(({ id }) => id)
assert(ids.length > 20, 'This check needs more than 20 eligible websites.')

async function spin(recentIds) {
  const response = await fetch(`${status.API_URL}/functions/v1/bump-website`, {
    method: 'POST',
    headers: { apikey: status.PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ category_id: null, recent_ids: recentIds, request_id: crypto.randomUUID() }),
  })
  const body = await response.json()
  assert.equal(response.status, 200, JSON.stringify(body))
  return body.website.id
}

const target = ids[0]
assert.equal(await spin(ids.slice(1)), target, 'All interests repeated while one unseen website remained.')
assert.notEqual(await spin(ids), ids.at(-1), 'A completed cycle repeated the immediately previous website.')
console.log(`All interests Edge Function excluded ${ids.length - 1} seen sites, then started a new cycle.`)
