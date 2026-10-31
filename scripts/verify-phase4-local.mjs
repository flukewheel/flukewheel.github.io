import { execSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const status = JSON.parse(execSync('npx supabase status --output json', { encoding: 'utf8' }))
const api = status.API_URL
const publishable = status.PUBLISHABLE_KEY
const client = createClient(api, publishable)
const email = `phase4-${crypto.randomUUID()}@example.test`
const { data: signup, error: signupError } = await client.auth.signUp({ email, password: 'FlukewheelPhaseFour42!' })
if (signupError || !signup.session || !signup.user) throw new Error('Local signup failed')

async function adminCall(body) {
  const response = await fetch(`${api}/functions/v1/admin-catalogue`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${signup.session.access_token}`, apikey: publishable, origin: 'http://127.0.0.1:5173' },
    body: JSON.stringify(body),
  })
  return { status: response.status, body: await response.json() }
}

const denied = await adminCall({ action: 'status' })
if (denied.status !== 403) throw new Error(`Non-admin access returned ${denied.status}`)
const directRole = await client.rpc('catalogue_admin', { p_actor_id: signup.user.id })
if (!directRole.error) throw new Error('Browser role could call the server-only administrator check')
const directCatalogue = await client.rpc('admin_catalogue_page', { p_actor_id: signup.user.id, p_search: '' })
if (!directCatalogue.error) throw new Error('Browser role could call the server-only catalogue page')
const directDelete = await client.rpc('delete_website_permanently', { p_actor_id: signup.user.id, p_website_id: crypto.randomUUID(), p_confirm_title: 'No website' })
if (!directDelete.error) throw new Error('Browser role could call the server-only website delete')

const roleFile = '.phase4-local-role.sql'
try {
  writeFileSync(roleFile, `insert into private.user_roles (user_id, role) values ('${signup.user.id}', 'admin');`)
  execSync('npx supabase db query --local --file .phase4-local-role.sql', { stdio: 'pipe' })
} finally { unlinkSync(roleFile) }

const allowed = await adminCall({ action: 'status' })
if (allowed.status !== 200) throw new Error(`Admin access returned ${allowed.status}: ${JSON.stringify(allowed.body)}`)

const originalUrl = `https://example.org/phase4-moderation-${crypto.randomUUID()}`
const submitted = await fetch(`${api}/functions/v1/submit-website`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5173', apikey: publishable },
  body: JSON.stringify({ original_url: originalUrl, suggested_categories: ['art'], description: 'A local moderation test', request_id: crypto.randomUUID() }),
})
const receipt = await submitted.json()
if (submitted.status !== 202) throw new Error(`Intake returned ${submitted.status}: ${JSON.stringify(receipt)}`)
const guestSubmissionRead = await createClient(api, publishable).from('website_submissions').select('id').eq('id', receipt.submission_id)
if (!guestSubmissionRead.error && guestSubmissionRead.data?.length) throw new Error('Pending suggestion was visible to a guest')

const queue = await adminCall({ action: 'queue' })
if (queue.status !== 200 || !queue.body.submissions.some((item) => item.id === receipt.submission_id)) throw new Error('Pending suggestion absent from admin queue')

const { data: category, error: categoryError } = await client.from('categories').select('id').eq('slug', 'art').single()
if (categoryError || !category) throw new Error('Art category is missing')
const review = {
  action: 'review', submission_id: receipt.submission_id, decision: 'approve',
  title: 'Phase Four Local Test', description: 'A local test entry for the review flow.',
  category_ids: [category.id], note: 'Verified inline in local test.',
}
const approved = await adminCall(review)
if (approved.status !== 200 || approved.body.status !== 'approved') throw new Error(`Approval failed: ${JSON.stringify(approved)}`)
const repeated = await adminCall(review)
if (repeated.status !== 200 || repeated.body.status !== 'approved') throw new Error('Repeated approval was not idempotent')
const publicRow = await client.from('websites').select('id').eq('id', approved.body.website_id).single()
if (publicRow.error) throw new Error('Approved website was not visible to guests')

const catalogue = await adminCall({ action: 'catalogue', search: 'Phase Four Local Test' })
if (catalogue.status !== 200 || !catalogue.body.websites.some((item) => item.id === approved.body.website_id)) throw new Error('Approved website missing from catalogue manager')
const catalogueIds = new Set()
let afterTitle = null
let afterId = null
let pageCount = 0
while (true) {
  const page = await adminCall({ action: 'catalogue', search: '', after_title: afterTitle, after_id: afterId })
  if (page.status !== 200 || !Array.isArray(page.body.websites)) throw new Error('Catalogue page could not be loaded')
  for (const website of page.body.websites) {
    if (catalogueIds.has(website.id)) throw new Error('Catalogue pagination repeated a website')
    catalogueIds.add(website.id)
  }
  pageCount += 1
  if (page.body.websites.length < 50) break
  const last = page.body.websites.at(-1)
  afterTitle = last.title
  afterId = last.id
  if (pageCount > 20) throw new Error('Catalogue pagination did not terminate')
}
if (catalogueIds.size <= 50 || pageCount < 2) throw new Error('Catalogue pagination omitted later websites')
const edited = await adminCall({
  action: 'edit_website', website_id: approved.body.website_id,
  title: 'Phase Four Local Test', description: 'A local test entry for the review flow.',
  thumbnail_path: null, category_ids: [category.id], active: false,
  embedding_status: 'allowed', note: 'Local deactivation check',
})
if (edited.status !== 200) throw new Error(`Deactivation failed: ${JSON.stringify(edited.body)}`)
const hidden = await client.from('websites').select('id').eq('id', approved.body.website_id).maybeSingle()
if (hidden.error || hidden.data) throw new Error('Deactivated website remained public')

const newCategory = await adminCall({
  action: 'save_category', category_id: null, slug: `local-test-${crypto.randomUUID().slice(0, 8)}`,
  name: 'Local Test', description: 'A local category management test.', active: false, display_order: 50,
})
if (newCategory.status !== 200 || !newCategory.body.category_id) throw new Error(`Category creation failed: ${JSON.stringify(newCategory.body)}`)

const reaction = await client.from('website_reactions').insert({
  user_id: signup.user.id, website_id: approved.body.website_id, reaction: 'dislike', reason: 'broken',
})
if (reaction.error) throw new Error(`Report setup failed: ${reaction.error.message}`)
const repeatedReport = await client.from('website_reactions').update({ reason: 'broken' }).eq('user_id', signup.user.id).eq('website_id', approved.body.website_id)
if (!repeatedReport.error) throw new Error('Repeated direct report bypassed the rate limit')
const reports = await adminCall({ action: 'reports' })
if (reports.status !== 200 || !reports.body.reports.some((item) => item.website_id === approved.body.website_id && item.broken === 1)) throw new Error('Broken-site report missing from review queue')
const reviewedReports = await adminCall({ action: 'review_reports', website_id: approved.body.website_id, note: 'Checked local report.' })
if (reviewedReports.status !== 200) throw new Error('Report review failed')
const clearedReports = await adminCall({ action: 'reports' })
if (clearedReports.body.reports.some((item) => item.website_id === approved.body.website_id)) throw new Error('Reviewed report remained in queue')

const rechecks = await adminCall({ action: 'rechecks' })
if (rechecks.status !== 200 || rechecks.body.rechecks.length === 0) throw new Error('Stale website recheck queue is empty')
const firstRecheck = rechecks.body.rechecks[0]
const deferred = await adminCall({
  action: 'complete_recheck', website_id: firstRecheck.website_id,
  outcome: 'failed', checked_url: firstRecheck.original_url,
  note: 'Could not verify this local recheck.',
})
if (deferred.status !== 200) throw new Error(`Recheck failure recording failed: ${JSON.stringify(deferred.body)}`)

const service = createClient(api, status.SERVICE_ROLE_KEY)
const other = createClient(api, publishable)
const { data: otherSignup, error: otherSignupError } = await other.auth.signUp({
  email: `phase4-delete-${crypto.randomUUID()}@example.test`, password: 'FlukewheelPhaseFour42!',
})
if (otherSignupError || !otherSignup.user) throw new Error('Second local signup failed')
const websiteId = approved.body.website_id
const { error: bookmarksError } = await service.from('bookmarks').insert([
  { user_id: signup.user.id, website_id: websiteId },
  { user_id: otherSignup.user.id, website_id: websiteId },
])
if (bookmarksError) throw new Error(`Delete test bookmark setup failed: ${bookmarksError.message}`)
const { error: historyError } = await service.from('bump_history').insert([
  { user_id: signup.user.id, website_id: websiteId, source: 'bump', request_id: crypto.randomUUID() },
  { user_id: signup.user.id, website_id: websiteId, source: 'card', request_id: crypto.randomUUID() },
  { user_id: otherSignup.user.id, website_id: websiteId, source: 'bump', request_id: crypto.randomUUID() },
])
if (historyError) throw new Error(`Delete test history setup failed: ${historyError.message}`)
const { error: secondReactionError } = await service.from('website_reactions').insert({
  user_id: otherSignup.user.id, website_id: websiteId, reaction: 'love',
})
if (secondReactionError) throw new Error(`Delete test reaction setup failed: ${secondReactionError.message}`)
const wrongConfirmation = await adminCall({ action: 'delete_website', website_id: websiteId, confirm_title: 'Wrong title' })
if (wrongConfirmation.status !== 400) throw new Error('Incorrect title did not block deletion')
const deleted = await adminCall({ action: 'delete_website', website_id: websiteId, confirm_title: 'Phase Four Local Test' })
if (deleted.status !== 200 || deleted.body.bookmarks_deleted !== 2 || deleted.body.history_deleted !== 3 || deleted.body.reactions_deleted !== 2 || deleted.body.submissions_deleted !== 1) {
  throw new Error(`Deletion did not remove all related records: ${JSON.stringify(deleted)}`)
}
for (const table of ['websites', 'bookmarks', 'bump_history', 'website_reactions']) {
  const { data, error } = await service.from(table).select(table === 'websites' ? 'id' : 'website_id').eq(table === 'websites' ? 'id' : 'website_id', websiteId)
  if (error || data?.length) throw new Error(`Deleted website remained in ${table}`)
}
const { data: oldSuggestions, error: oldSuggestionsError } = await service.from('website_submissions').select('id').eq('normalised_url', originalUrl)
if (oldSuggestionsError || oldSuggestions?.length) throw new Error('Deleted website remained in submissions')

console.log('Phase 4 local intake and moderation checks passed')
