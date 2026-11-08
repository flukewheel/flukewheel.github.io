import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const output = execSync('npx supabase status --output json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const status = JSON.parse(output.slice(output.indexOf('{'), output.lastIndexOf('}') + 1))
const api = status.API_URL
const publicKey = status.PUBLISHABLE_KEY
const secretKey = status.SECRET_KEY
if (api !== 'http://127.0.0.1:54421' || !publicKey || !secretKey) {
  throw new Error('This check requires the local Flukewheel Supabase stack.')
}

const service = createClient(api, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
const people = []
const pendingId = crypto.randomUUID()
const pendingUrl = `https://phase8-${pendingId}.example.test/`
let pendingCreated = false

async function createPerson(label) {
  const email = `phase8-${label}-${crypto.randomUUID()}@example.test`
  const password = `Phase8-${crypto.randomUUID()}!`
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error || !created.data.user) throw created.error ?? new Error('Fixture account creation failed.')
  const id = created.data.user.id
  people.push(id)
  const client = createClient(api, publicKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const signedIn = await client.auth.signInWithPassword({ email, password })
  if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error('Fixture sign-in failed.')
  return { id, token: signedIn.data.session.access_token }
}

async function rest(path, token, { method = 'GET', body, schema } = {}) {
  const response = await fetch(`${api}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: publicKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(schema ? { 'Accept-Profile': schema, 'Content-Profile': schema } : {}),
      ...(body ? { 'Content-Type': 'application/json', Prefer: 'return=representation' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}

try {
  const a = await createPerson('a')
  const b = await createPerson('b')
  const administrator = await createPerson('admin')
  execSync(`npx supabase db query --local "insert into private.user_roles (user_id, role) values ('${administrator.id}', 'admin')"`, { stdio: ['ignore', 'pipe', 'pipe'] })
  const profiles = await service.from('profiles').upsert([{ id: a.id }, { id: b.id }, { id: administrator.id }])
  if (profiles.error) throw profiles.error
  const websites = await service.from('websites').insert({
    id: pendingId, original_url: pendingUrl, normalised_url: pendingUrl,
    title: 'Phase 8 pending fixture', description: 'Must remain private.', approval_status: 'pending', active: false,
  })
  if (websites.error) throw websites.error
  pendingCreated = true
  const bookmarks = await service.from('bookmarks').insert([
    { user_id: a.id, website_id: '20000000-0000-4000-8000-000000000001' },
    { user_id: b.id, website_id: '20000000-0000-4000-8000-000000000002' },
  ])
  if (bookmarks.error) throw bookmarks.error
  const history = await service.from('bump_history').insert([
    { user_id: a.id, website_id: '20000000-0000-4000-8000-000000000001', source: 'bump', request_id: crypto.randomUUID() },
    { user_id: b.id, website_id: '20000000-0000-4000-8000-000000000002', source: 'bump', request_id: crypto.randomUUID() },
  ])
  if (history.error) throw history.error

  for (const token of [null, a.token, b.token, administrator.token]) {
    const pending = await rest(`websites?select=id&id=eq.${pendingId}`, token)
    assert.equal(pending.status, 200)
    assert.deepEqual(pending.body, [], 'Pending catalogue data leaked through REST.')
  }
  const guestProfile = await rest('profiles?select=id', null)
  assert.notEqual(guestProfile.status, 200, 'Guest read profiles through REST.')
  const guestBookmarks = await rest('bookmarks?select=user_id', null)
  assert(guestBookmarks.status !== 200 || guestBookmarks.body.length === 0, 'Guest read bookmarks through REST.')
  const guestHistory = await rest('bump_history?select=user_id', null)
  assert(guestHistory.status !== 200 || guestHistory.body.length === 0, 'Guest read history through REST.')
  const aProfiles = await rest('profiles?select=id', a.token)
  assert.deepEqual(aProfiles.body, [{ id: a.id }], 'Member A saw another profile.')
  const bProfiles = await rest('profiles?select=id', b.token)
  assert.deepEqual(bProfiles.body, [{ id: b.id }], 'Member B saw another profile.')

  const aBookmarks = await rest('bookmarks?select=user_id,website_id', a.token)
  assert.equal(aBookmarks.status, 200)
  assert.equal(aBookmarks.body.length, 1)
  assert.equal(aBookmarks.body[0].user_id, a.id)
  const bBookmarks = await rest('bookmarks?select=user_id,website_id', b.token)
  assert.equal(bBookmarks.status, 200)
  assert.equal(bBookmarks.body.length, 1)
  assert.equal(bBookmarks.body[0].user_id, b.id)
  for (const person of [a, b]) {
    const ownHistory = await rest('bump_history?select=user_id,website_id', person.token)
    assert.equal(ownHistory.status, 200)
    assert.equal(ownHistory.body.length, 1)
    assert.equal(ownHistory.body[0].user_id, person.id, 'Member saw another account’s history.')
  }
  const crossBookmark = await rest('bookmarks', a.token, {
    method: 'POST', body: { user_id: b.id, website_id: '20000000-0000-4000-8000-000000000003' },
  })
  assert.equal(crossBookmark.status, 403, 'Member A wrote a bookmark owned by B.')
  const reassignment = await rest(`profiles?id=eq.${a.id}`, a.token, { method: 'PATCH', body: { id: b.id } })
  assert.equal(reassignment.status, 403, 'Profile owner reassignment was accepted.')

  for (const token of [a.token, administrator.token]) {
    const privateRoles = await rest('user_roles?select=user_id,role', token, { schema: 'private' })
    assert.notEqual(privateRoles.status, 200, 'Private roles were exposed through REST.')
    const adminRpc = await rest('rpc/admin_submission_queue', token, { method: 'POST', body: { p_actor_id: administrator.id } })
    assert.notEqual(adminRpc.status, 200, 'Trusted admin RPC was callable from a browser role.')
  }

  const guestRecommendations = await rest('rpc/recommend_website_ids', null, { method: 'POST', body: { p_limit: 6 } })
  assert.notEqual(guestRecommendations.status, 200, 'Guest received private recommendations.')
  for (const token of [a.token, b.token, administrator.token]) {
    const recommendations = await rest('rpc/recommend_website_ids', token, { method: 'POST', body: { p_limit: 6 } })
    assert.equal(recommendations.status, 200)
    assert(recommendations.body.length > 0)
  }

  console.log('Phase 8 direct REST/RPC guest, member A/B and administrator boundaries passed.')
} finally {
  if (pendingCreated) await service.from('websites').delete().eq('id', pendingId)
  for (const id of people.reverse()) await service.auth.admin.deleteUser(id)
}
