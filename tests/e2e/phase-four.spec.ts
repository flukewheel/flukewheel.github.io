import { expect, test } from '@playwright/test'

test('guest suggestions enter review and duplicate URLs are rejected', async ({ page }) => {
  const url = `https://example.org/flukewheel-suggestion-${crypto.randomUUID()}?utm_source=browser-test`
  await page.goto('/#/')
  await page.getByRole('button', { name: 'Add a website' }).click()
  const dialog = page.getByRole('dialog', { name: 'Suggest a website' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('textbox', { name: 'Website URL' }).fill(url)
  await dialog.getByRole('checkbox', { name: /Arts, Design & Crafts/ }).check()
  await dialog.getByRole('textbox', { name: 'Why is it worth sharing? (optional)' }).fill('An interesting web corner.')
  await dialog.getByRole('button', { name: 'Send suggestion' }).click()
  await expect(dialog.getByText('Thanks. Your suggestion is in the review queue.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Done' }).click()

  await page.getByRole('button', { name: 'Add a website' }).click()
  await dialog.getByRole('textbox', { name: 'Website URL' }).fill(url.replace('utm_source=browser-test', 'utm_campaign=repeat'))
  await dialog.getByRole('button', { name: 'Send suggestion' }).click()
  await expect(dialog.getByRole('alert')).toContainText('already been suggested or added')
})

test('administrator can work through review, catalogue and maintenance screens', async ({ page }) => {
  const email = `phase4-admin-ui-${crypto.randomUUID()}@example.test`
  const categoryId = '10000000-0000-4000-8000-000000000001'
  const websiteId = '20000000-0000-4000-8000-000000000115'
  let pending = true
  let reportsPending = true
  let rechecksPending = true
  let deleted = false
  const actions: string[] = []
  await page.route('**/functions/v1/submit-website', async (route) => {
    pending = true
    await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ status: 'pending', receipt_id: crypto.randomUUID() }) })
  })
  await page.route('**/functions/v1/admin-catalogue', async (route) => {
    const body = route.request().postDataJSON() as { action: string; after_id?: string | null }
    actions.push(body.action)
    const result: Record<string, unknown> = {
      status: { administrator: true },
      queue: { submissions: pending ? [{ id: '40000000-0000-4000-8000-000000000001', raw_url: 'https://example.org/admin-review', normalised_url: 'https://example.org/admin-review', suggested_categories: ['art'], description: 'An unusual page.', submitted_at: new Date().toISOString(), validation_status: 'pending', verification_notes: null, duplicate_website_id: null }] : [] },
      review: { status: 'approved', website_id: websiteId },
      catalogue: { websites: Array.from({ length: 52 }, (_, index) => ({ id: index === 0 ? websiteId : `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`, title: `Sample Site ${index + 1}`, description: 'A sample website.', original_url: `https://example.org/sample-${index + 1}`, thumbnail_path: null, active: true, embedding_status: 'allowed', last_validated_at: null, category_ids: [categoryId] })).filter((website) => !deleted || website.id !== websiteId).slice(body.after_id ? 50 : 0, body.after_id ? 52 : 50) },
      categories: { categories: [{ id: categoryId, slug: 'art', name: 'Art', description: 'Art sites.', active: true, display_order: 1 }] },
      edit_website: { website_id: websiteId },
      delete_website: { website_id: websiteId, bookmarks_deleted: 2, history_deleted: 3, reactions_deleted: 2, submissions_deleted: 1 },
      save_category: { category_id: categoryId },
      reports: { reports: reportsPending ? [{ website_id: websiteId, title: 'Sample Site', original_url: 'https://example.org/sample', active: true, broken: 1, inappropriate: 0, low_quality: 0, last_reported_at: new Date().toISOString() }] : [] },
      review_reports: { website_id: websiteId },
      rechecks: { rechecks: rechecksPending ? [{ website_id: websiteId, title: 'Sample Site', original_url: 'https://example.org/sample', status: 'pending', attempts: 0, last_validated_at: null, note: null }] : [] },
      complete_recheck: { website_id: websiteId },
    }
    if (body.action === 'review') pending = false
    if (body.action === 'review_reports') reportsPending = false
    if (body.action === 'complete_recheck') rechecksPending = false
    if (body.action === 'delete_website') deleted = true
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result[body.action]) })
  })

  await page.goto('/#/')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('FlukewheelTestPassword42!')
  await page.getByRole('button', { name: 'Sign up', exact: true }).click()
  await page.getByRole('button', { name: 'Not now' }).click()
  await page.getByRole('button', { name: `Account menu for ${email.split('@')[0]}` }).click()
  const accountMenu = page.getByRole('menu')
  await expect(accountMenu.getByRole('menuitem')).toHaveCount(5)
  await expect(accountMenu.locator('.interest-option__icon svg')).toHaveCount(5)
  await accountMenu.getByRole('menuitem', { name: 'Administration' }).click()
  await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible()

  await page.getByRole('button', { name: 'Approve and publish' }).click()
  await expect(page.getByRole('alert')).toContainText('Check the embedded page')
  await page.getByRole('textbox', { name: 'Title' }).fill('Admin reviewed site')
  await page.getByRole('textbox', { name: 'Description' }).fill('A useful discovery for the catalogue.')
  await page.getByRole('checkbox', { name: 'Arts, Design & Crafts', exact: true }).check()
  await page.getByRole('textbox', { name: 'Private verification or rejection note' }).fill('Checked inline on the hosted origin.')
  await page.getByRole('checkbox', { name: 'I checked that this page is usable inside Flukewheel.' }).check()
  await page.getByRole('button', { name: 'Approve and publish' }).click()
  await expect(page.getByText('No suggestions are waiting for review.')).toBeVisible()

  await page.getByRole('button', { name: 'Catalogue', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Edit website' })).toBeVisible()
  await expect(page.getByText('Showing all 52 matching websites.')).toBeVisible()
  const catalogueList = page.getByRole('navigation', { name: 'Catalogue websites' })
  expect(await catalogueList.evaluate((element) => element.scrollHeight > element.clientHeight && getComputedStyle(element).overflowY === 'auto')).toBe(true)
  await page.getByRole('textbox', { name: 'Private change note' }).fill('Reviewing catalogue metadata.')
  await page.getByRole('button', { name: 'Save website' }).click()
  await expect(page.getByText('Website updated.')).toBeVisible()
  await page.getByRole('main').getByRole('button', { name: 'Add a website' }).click()
  const suggestion = page.getByRole('dialog', { name: 'Suggest a website' })
  await suggestion.getByRole('textbox', { name: 'Website URL' }).fill('https://example.org/admin-added')
  await suggestion.getByRole('button', { name: 'Send suggestion' }).click()
  await expect(suggestion.getByText('Thanks. Your suggestion is in the review queue.')).toBeVisible()
  await suggestion.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByText('Suggestion received. Open Suggestions to review and publish it.')).toBeVisible()
  await page.getByRole('button', { name: 'Suggestions', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Review suggestion' })).toBeVisible()

  await page.getByRole('button', { name: 'Catalogue', exact: true }).click()
  await page.getByRole('button', { name: 'Delete website' }).click()
  const confirmDelete = page.getByRole('button', { name: 'Permanently delete website' })
  await expect(confirmDelete).toBeDisabled()
  await page.getByRole('textbox', { name: /Type .* to confirm/ }).fill('Wrong title')
  await expect(confirmDelete).toBeDisabled()
  await page.getByRole('textbox', { name: /Type .* to confirm/ }).fill('Sample Site 1')
  await confirmDelete.click()
  await expect(page.getByText('Showing all 51 matching websites.')).toBeVisible()
  await expect(page.getByText('Website deleted. Removed 2 bookmarks, 3 history entries and 2 reactions.')).toBeVisible()

  await page.getByRole('button', { name: 'Categories', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Edit category' })).toBeVisible()
  await page.getByRole('button', { name: 'Save category' }).click()
  await expect(page.getByText('Category saved.')).toBeVisible()

  await page.getByRole('button', { name: 'Reports', exact: true }).click()
  await page.getByRole('textbox', { name: 'Private review note' }).fill('Checked reported site.')
  await page.getByRole('button', { name: 'Mark reports reviewed' }).click()
  await expect(page.getByText('No reports need review.')).toBeVisible()

  await page.getByRole('button', { name: 'Rechecks', exact: true }).click()
  await page.getByRole('textbox', { name: 'Private verification note' }).fill('Checked again in the viewer.')
  await page.getByRole('button', { name: 'Save recheck' }).click()
  await expect(page.getByText('No websites are waiting for a recheck.')).toBeVisible()
  expect(actions).toEqual(expect.arrayContaining(['status', 'queue', 'review', 'catalogue', 'edit_website', 'delete_website', 'categories', 'save_category', 'reports', 'review_reports', 'rechecks', 'complete_recheck']))
})
