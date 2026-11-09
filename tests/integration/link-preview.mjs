import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const output = execSync('npx supabase status --output json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const status = JSON.parse(output.slice(output.indexOf('{'), output.lastIndexOf('}') + 1))
assert.equal(status.API_URL, 'http://127.0.0.1:54421', 'Use the local Flukewheel stack only.')
const service = createClient(status.API_URL, status.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const publicClient = createClient(status.API_URL, status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const id = crypto.randomUUID()
const email = `preview-${id}@example.test`
const password = `Preview-${crypto.randomUUID()}!`
const originalUrl = `https://github.com/?flukewheel-preview-test=${id}`
let userId = null
let websiteId = null
let path = null

try {
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error || !created.data.user) throw created.error ?? new Error('Could not create administrator fixture.')
  userId = created.data.user.id
  execSync(`npx supabase db query --local "insert into private.user_roles (user_id, role) values ('${userId}', 'admin')"`, { stdio: ['ignore', 'pipe', 'pipe'] })
  const signedIn = await publicClient.auth.signInWithPassword({ email, password })
  if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error('Fixture sign-in failed.')
  const inserted = await service.from('websites').insert({
    original_url: originalUrl, normalised_url: originalUrl, title: 'Link preview integration fixture',
    description: 'Temporary fixture for link preview image extraction.',
    approval_status: 'approved', active: true, embedding_status: 'unknown', approved_at: new Date().toISOString(),
  }).select('id').single()
  if (inserted.error || !inserted.data) throw inserted.error ?? new Error('Fixture website insert failed.')
  websiteId = inserted.data.id
  const response = await fetch(`${status.API_URL}/functions/v1/admin-catalogue`, {
    method: 'POST',
    headers: { apikey: status.PUBLISHABLE_KEY, Authorization: `Bearer ${signedIn.data.session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'refresh_preview', website_id: websiteId }),
  })
  const result = await response.json()
  assert.equal(response.status, 200, JSON.stringify(result))
  assert.equal(result.found, true, 'A public site with an Open Graph image should yield a preview.')
  const saved = await service.from('websites').select('thumbnail_path').eq('id', websiteId).single()
  if (saved.error || !saved.data) throw saved.error ?? new Error('Could not read preview path.')
  path = saved.data.thumbnail_path
  assert.match(path, /^link-previews\/[0-9a-f-]+\.(?:jpg|png|webp)$/)
  const image = await service.storage.from('thumbnails').download(path)
  if (image.error || !image.data) throw image.error ?? new Error('Could not download stored preview.')
  assert(image.data.size > 100, 'Stored preview image should contain image bytes.')
  console.log('Link preview metadata, storage, and website association passed.')
} finally {
  if (websiteId) await service.from('websites').delete().eq('id', websiteId)
  if (path) await service.storage.from('thumbnails').remove([path])
  if (userId) await service.auth.admin.deleteUser(userId)
}
