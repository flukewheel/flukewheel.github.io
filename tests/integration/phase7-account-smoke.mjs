import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const statusOutput = execSync('npx supabase status --output json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const firstBrace = statusOutput.indexOf('{')
const lastBrace = statusOutput.lastIndexOf('}')
if (firstBrace < 0 || lastBrace <= firstBrace) throw new Error('Local Supabase status JSON was not returned.')
const status = JSON.parse(statusOutput.slice(firstBrace, lastBrace + 1))
const url = status.API_URL
const publishableKey = status.PUBLISHABLE_KEY
const secretKey = status.SECRET_KEY
if (url !== 'http://127.0.0.1:54421' || !publishableKey || !secretKey) {
  throw new Error('This smoke test requires the isolated local Flukewheel Supabase stack.')
}

const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
const member = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
const email = `phase7-avatar-${crypto.randomUUID()}@example.test`
const password = `Phase7-${crypto.randomUUID()}!`
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==', 'base64')
let userId
let avatarPath
let adminUserId

try {
  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (createError || !created.user) throw createError ?? new Error('Account creation failed.')
  userId = created.user.id
  avatarPath = `${userId}/${crypto.randomUUID()}.png`
  const uploaded = await admin.storage.from('avatars').upload(avatarPath, image, { contentType: 'image/png' })
  if (uploaded.error) throw uploaded.error

  const signedIn = await member.auth.signInWithPassword({ email, password })
  if (signedIn.error) throw signedIn.error
  const deleted = await member.functions.invoke('delete-account', { body: { confirm_email: email } })
  if (deleted.error || deleted.data?.code !== 'OK') {
    throw deleted.error ?? new Error(`Deletion returned ${deleted.data?.code ?? 'no result'}.`)
  }
  const remaining = await admin.storage.from('avatars').list(userId)
  if (remaining.error) throw remaining.error
  assert.equal(remaining.data?.length, 0, 'Avatar object survived account deletion.')
  const lookup = await admin.auth.admin.getUserById(userId)
  assert.equal(lookup.data.user, null, 'Auth user survived account deletion.')

  const adminEmail = `phase7-admin-${crypto.randomUUID()}@example.test`
  const createdAdmin = await admin.auth.admin.createUser({ email: adminEmail, password, email_confirm: true })
  if (createdAdmin.error || !createdAdmin.data.user) throw createdAdmin.error ?? new Error('Admin fixture creation failed.')
  adminUserId = createdAdmin.data.user.id
  assert.match(adminUserId, /^[0-9a-f-]{36}$/i)
  execSync(`npx supabase db query --local "insert into private.user_roles (user_id, role) values ('${adminUserId}', 'admin')"`, { stdio: ['ignore', 'pipe', 'pipe'] })
  const adminSignIn = await member.auth.signInWithPassword({ email: adminEmail, password })
  if (adminSignIn.error) throw adminSignIn.error
  const refused = await member.functions.invoke('delete-account', { body: { confirm_email: adminEmail } })
  const response = refused.error && 'context' in refused.error ? refused.error.context : null
  assert.equal(response instanceof Response ? response.status : null, 409, 'Administrator deletion was not refused.')
  const stillThere = await admin.auth.admin.getUserById(adminUserId)
  assert.equal(stillThere.data.user?.id, adminUserId, 'Refused administrator deletion removed the Auth user.')
  console.log('Phase 7 local avatar cleanup, Auth deletion and administrator refusal passed.')
} finally {
  if (avatarPath) await admin.storage.from('avatars').remove([avatarPath])
  if (userId) await admin.auth.admin.deleteUser(userId)
  if (adminUserId) await admin.auth.admin.deleteUser(adminUserId)
}
