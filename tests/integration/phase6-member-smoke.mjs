import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const status = JSON.parse(execSync('npx supabase status --output json', { encoding: 'utf8' }))
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY)
const member = createClient(status.API_URL, status.ANON_KEY)
const email = `phase6-${randomUUID()}@example.test`
const password = `Test-${randomUUID()}!`
let userId
try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error || !created.data.user) throw created.error ?? new Error('No user created')
  userId = created.data.user.id
  const signedIn = await member.auth.signInWithPassword({ email, password })
  if (signedIn.error) throw signedIn.error
  const request = { category_id: null, recent_ids: [], request_id: randomUUID() }
  const first = await member.functions.invoke('bump-website', { body: request })
  const second = await member.functions.invoke('bump-website', { body: request })
  if (first.error || second.error) throw first.error ?? second.error
  if (first.data.website.id !== second.data.website.id || first.data.selection_id !== second.data.selection_id
    || first.data.exclusions_relaxed !== second.data.exclusions_relaxed) {
    throw new Error('Retry returned a different selection')
  }
  const rows = await member.from('bump_history').select('id').eq('request_id', request.request_id)
  if (rows.error || rows.data.length !== 1) throw rows.error ?? new Error('Expected one history event')
  const invalid = await member.functions.invoke('bump-website', {
    body: { category_id: randomUUID(), recent_ids: [], request_id: randomUUID() },
  })
  if (!invalid.error || invalid.error.context?.status !== 400) {
    throw new Error('Unknown category was not rejected')
  }
  console.log('member selection and idempotent retry passed')
} finally {
  if (userId) {
    const removed = await admin.auth.admin.deleteUser(userId)
    if (removed.error) throw removed.error
  }
}
