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
