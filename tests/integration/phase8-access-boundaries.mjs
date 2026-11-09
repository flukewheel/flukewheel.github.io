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
let submittedId = null
let approvedId = null
const approvedTitle = 'Phase 8 approval fixture'
const storageFixtures = []
const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==', 'base64')

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

async function storageObject(bucket, path, token, method = 'GET') {
  return fetch(`${api}/storage/v1/object/${bucket}/${path}`, {
    method,
    headers: {
      apikey: publicKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(method === 'POST' ? { 'Content-Type': 'image/png' } : {}),
    },
    body: method === 'POST' ? onePixelPng : undefined,
  })
}

async function edge(name, token, body) {
  const response = await fetch(`${api}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: publicKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return { status: response.status, body: await response.json() }
}

try {
  const a = await createPerson('a')
  const b = await createPerson('b')
  const administrator = await createPerson('admin')
  execSync(`npx supabase db query --local "insert into private.user_roles (user_id, role) values ('${administrator.id}', 'admin')"`, { stdio: ['ignore', 'pipe', 'pipe'] })
  const suggestionUrl = `https://phase8-${crypto.randomUUID()}.example.org/`
  const submitted = await edge('submit-website', null, {
    original_url: suggestionUrl, suggested_categories: ['art'],
    description: 'Synthetic Phase 8 intake fixture.', request_id: crypto.randomUUID(),
  })
  assert.equal(submitted.status, 202, 'Guest suggestion was not accepted.')
  submittedId = submitted.body.submission_id
  assert(submittedId, 'Suggestion receipt lacked an ID.')
  const queue = await edge('admin-catalogue', administrator.token, { action: 'queue' })
  assert.equal(queue.status, 200, 'Administrator could not load the review queue.')
  assert(queue.body.submissions.some((item) => item.id === submittedId), 'New suggestion was absent from the review queue.')
  const reviewed = await edge('admin-catalogue', administrator.token, {
    action: 'review', submission_id: submittedId, decision: 'approve',
    title: approvedTitle, description: 'Synthetic catalogue test fixture.',
    category_ids: ['10000000-0000-4000-8000-000000000003'],
  })
  assert.equal(reviewed.status, 200, `Administrator could not approve the suggestion: ${JSON.stringify(reviewed.body)}`)
  assert.equal(reviewed.body.status, 'approved')
  approvedId = reviewed.body.website_id
  const publicApproved = await rest(`websites?select=id,title&id=eq.${approvedId}`, null)
  assert.deepEqual(publicApproved.body, [{ id: approvedId, title: approvedTitle }], 'Approved suggestion was not public.')
  const oversized = await fetch(`${api}/functions/v1/admin-catalogue`, {
    method: 'POST',
    headers: { apikey: publicKey, Authorization: `Bearer ${administrator.token}`, 'Content-Type': 'application/json' },
    body: new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode(JSON.stringify({ action: 'status', padding: 'x'.repeat(9000) })))
      controller.close()
    } }),
    duplex: 'half',
  })
  assert.equal(oversized.status, 413, 'Chunked administrator request bypassed the byte limit.')
  const avatarPath = `${a.id}/phase8-${crypto.randomUUID()}.png`
  const thumbnailPath = `phase8-${crypto.randomUUID()}.png`
  for (const [bucket, path] of [['avatars', avatarPath], ['thumbnails', thumbnailPath]]) {
    const uploaded = await service.storage.from(bucket).upload(path, onePixelPng, { contentType: 'image/png' })
    if (uploaded.error) throw uploaded.error
    storageFixtures.push({ bucket, path })
  }
  assert.equal((await storageObject('avatars', avatarPath, a.token)).status, 200, 'Avatar owner could not read their private image.')
  for (const token of [null, b.token, administrator.token]) {
    assert.notEqual((await storageObject('avatars', avatarPath, token)).status, 200, 'Private avatar leaked through Storage.')
  }
  assert.equal((await storageObject('thumbnails', thumbnailPath, null)).status, 200, 'Public thumbnail was not readable.')
  for (const [bucket, path] of [['avatars', `${a.id}/unauthorised-${crypto.randomUUID()}.png`], ['thumbnails', `unauthorised-${crypto.randomUUID()}.png`]]) {
    for (const token of [null, a.token, administrator.token]) {
      const attempted = await storageObject(bucket, path, token, 'POST')
      if (attempted.ok) storageFixtures.push({ bucket, path })
      assert(!attempted.ok, 'Browser role uploaded an image through Storage.')
    }
  }
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

  console.log('Phase 8 suggestion-to-approval and direct REST/RPC/Storage boundaries passed.')
} finally {
  const cleanupErrors = []
  if (approvedId && people.length > 0) {
    const removed = await service.rpc('delete_website_permanently', {
      p_actor_id: people[2], p_website_id: approvedId, p_confirm_title: approvedTitle,
    })
    if (removed.error) cleanupErrors.push(removed.error)
    else {
      try {
        execSync(`npx supabase db query --local "delete from private.moderation_events where target_type = 'website' and target_id = '${approvedId}'"`, { stdio: ['ignore', 'pipe', 'pipe'] })
      } catch (error) { cleanupErrors.push(error) }
    }
  } else if (submittedId) await service.from('website_submissions').delete().eq('id', submittedId)
  for (const { bucket, path } of storageFixtures) await service.storage.from(bucket).remove([path])
  if (pendingCreated) await service.from('websites').delete().eq('id', pendingId)
  for (const id of people.reverse()) await service.auth.admin.deleteUser(id)
  if (cleanupErrors.length) throw cleanupErrors[0]
}
