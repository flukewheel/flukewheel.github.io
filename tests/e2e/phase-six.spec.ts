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

test('viewer help stays compact until requested', async ({ page }) => {
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (request.isNavigationRequest() && request.frame().parentFrame()) await route.abort()
    else await route.continue()
  })
  await page.goto('/#/viewer/20000000-0000-4000-8000-000000000115')
  await expect(page.locator('iframe')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Trouble viewing?' })).toBeVisible({ timeout: 12000 })
  await expect(page.getByText('Choose Broken website from the thumbs-down menu')).toHaveCount(0)
  await page.getByRole('button', { name: 'Trouble viewing?' }).click()
  await expect(page.getByText(/Choose Broken website from the thumbs-down menu/)).toBeVisible()
})

test('a redirected external page remains inside the viewer', async ({ page }) => {
  await page.route('https://rainmirage.neocities.org/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<script>location.href="https://example.org/phase6-redirect"</script>' })
  })
  await page.route('https://example.org/phase6-redirect', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Redirected site</h1>' })
  })
  await page.goto('/#/viewer/20000000-0000-4000-8000-000000000115', { waitUntil: 'domcontentloaded' })
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Redirected site' })).toBeVisible()
  await expect(page).toHaveURL(/#\/viewer\/20000000-0000-4000-8000-000000000115$/)
})

test('a slow external page can finish after the trouble hint appears', async ({ page }) => {
  await page.route('https://rainmirage.neocities.org/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 10500))
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Slow site</h1>' })
  })
  await page.goto('/#/viewer/20000000-0000-4000-8000-000000000115', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Trouble viewing?' })).toBeVisible({ timeout: 12000 })
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Slow site' })).toBeVisible()
  await expect(page.locator('iframe')).toHaveCount(1)
})
