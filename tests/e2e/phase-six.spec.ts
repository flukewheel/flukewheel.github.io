import { expect, test } from '@playwright/test'

test('Copy Link copies the original website URL', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => {
        (window as Window & { copiedWebsiteUrl?: string }).copiedWebsiteUrl = text
      } },
    })
  })
  await page.goto('/#/viewer/20000000-0000-4000-8000-000000000362')
  const button = page.getByRole('button', { name: 'Copy discovery link' })
  await expect(button).toBeEnabled()
  await button.click()
  await expect.poll(() => page.evaluate(() => (window as Window & { copiedWebsiteUrl?: string }).copiedWebsiteUrl))
    .toBe('https://barefeetmusic.com/')
})

test('a delayed Bump cannot replace a website opened while it was pending', async ({ page }) => {
  let release!: () => void
  const wait = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/functions/v1/bump-website', async (route) => {
    await wait
    const requestId = route.request().postDataJSON().request_id as string
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      request_id: requestId,
      selection_id: '30000000-0000-4000-8000-000000000001',
      website: {
        id: '20000000-0000-4000-8000-000000000001',
        title: 'Delayed selection', description: 'A delayed selection',
        original_url: 'https://example.com/', thumbnail_url: null,
        category_ids: [], delivery_mode: 'inline',
      },
      exclusions_relaxed: false,
    }) })
  })
  await page.goto('/#/')
  const pending = page.waitForRequest('**/functions/v1/bump-website')
  await page.getByRole('button', { name: 'Bump!' }).click()
  await pending
  await page.locator('.card-carousel .card-link').first().click()
  const cardUrl = page.url()
  release()
  await expect(page).toHaveURL(cardUrl)
  await page.waitForTimeout(600)
  await expect(page).toHaveURL(cardUrl)
})
