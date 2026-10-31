import { expect, test } from '@playwright/test'

test('guest suggestions enter review and duplicate URLs are rejected', async ({ page }) => {
  const url = `https://example.org/flukewheel-suggestion-${crypto.randomUUID()}?utm_source=browser-test`
  await page.goto('/#/')
  await page.getByRole('button', { name: 'Add a website' }).click()
  const dialog = page.getByRole('dialog', { name: 'Suggest a website' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('textbox', { name: 'Website URL' }).fill(url)
  await dialog.getByRole('checkbox', { name: 'Art' }).check()
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
  const actions: string[] = []
  await page.route('**/functions/v1/admin-catalogue', async (route) => {
    const body = route.request().postDataJSON() as { action: string }
    actions.push(body.action)
    const result: Record<string, unknown> = {
      status: { administrator: true },
      queue: { submissions: pending ? [{ id: '40000000-0000-4000-8000-000000000001', raw_url: 'https://example.org/admin-review', normalised_url: 'https://example.org/admin-review', suggested_categories: ['art'], description: 'An unusual page.', submitted_at: new Date().toISOString(), validation_status: 'pending', verification_notes: null, duplicate_website_id: null }] : [] },
      review: { status: 'approved', website_id: websiteId },
      catalogue: { websites: [{ id: websiteId, title: 'Sample Site', description: 'A sample website.', original_url: 'https://example.org/sample', thumbnail_path: null, active: true, embedding_status: 'allowed', last_validated_at: null, category_ids: [categoryId] }] },
      categories: { categories: [{ id: categoryId, slug: 'art', name: 'Art', description: 'Art sites.', active: true, display_order: 1 }] },
      edit_website: { website_id: websiteId },
      save_category: { category_id: categoryId },
      reports: { reports: reportsPending ? [{ website_id: websiteId, title: 'Sample Site', original_url: 'https://example.org/sample', active: true, broken: 1, inappropriate: 0, low_quality: 0, last_reported_at: new Date().toISOString() }] : [] },
      review_reports: { website_id: websiteId },
      rechecks: { rechecks: rechecksPending ? [{ website_id: websiteId, title: 'Sample Site', original_url: 'https://example.org/sample', status: 'pending', attempts: 0, last_validated_at: null, note: null }] : [] },
      complete_recheck: { website_id: websiteId },
    }
    if (body.action === 'review') pending = false
    if (body.action === 'review_reports') reportsPending = false
    if (body.action === 'complete_recheck') rechecksPending = false
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result[body.action]) })
  })

  await page.goto('/#/')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('FlukewheelTestPassword42!')
  await page.getByRole('button', { name: 'Sign up', exact: true }).click()
  await page.getByRole('button', { name: 'Not now' }).click()
  await page.goto('/#/admin')
  await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible()

  await page.getByRole('button', { name: 'Approve and publish' }).click()
  await expect(page.getByRole('alert')).toContainText('Check the embedded page')
  await page.getByRole('textbox', { name: 'Title' }).fill('Admin reviewed site')
  await page.getByRole('textbox', { name: 'Description' }).fill('A useful discovery for the catalogue.')
  await page.getByRole('checkbox', { name: 'Art' }).check()
  await page.getByRole('textbox', { name: 'Private verification or rejection note' }).fill('Checked inline on the hosted origin.')
  await page.getByRole('checkbox', { name: 'I checked that this page is usable inside Flukewheel.' }).check()
  await page.getByRole('button', { name: 'Approve and publish' }).click()
  await expect(page.getByText('No suggestions are waiting for review.')).toBeVisible()

  await page.getByRole('button', { name: 'Catalogue', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Edit website' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Private change note' }).fill('Reviewing catalogue metadata.')
  await page.getByRole('button', { name: 'Save website' }).click()
  await expect(page.getByText('Website updated.')).toBeVisible()

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
  expect(actions).toEqual(expect.arrayContaining(['status', 'queue', 'review', 'catalogue', 'edit_website', 'categories', 'save_category', 'reports', 'review_reports', 'rechecks', 'complete_recheck']))
})
