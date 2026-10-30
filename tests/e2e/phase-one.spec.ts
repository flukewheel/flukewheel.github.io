import { expect, test } from '@playwright/test'

test('homepage reads the public catalogue and keeps the viewer unmounted', async ({ page }) => {
  await page.goto('/#/')

  await expect(page.getByRole('link', { name: 'flukewheel home' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bump!' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'internet as an art.' })).toBeVisible()
  await expect(page.getByText('It never got smaller or less interesting, you just became held down by the commerce of things.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recently added' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'For you' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Explore categories' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Discover Rain Mirage' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Discover All the Damn Tools' })).toHaveCount(0)
  await expect(page.locator('.card-carousel .website-card')).toHaveCount(10)
  await expect(page.locator('.website-card__art img').first()).toBeVisible()
  await expect(page.getByText('made with')).toBeVisible()
  await expect(page.getByText('Fresh finds')).toHaveCount(0)
  await expect(page.getByText('The Public Domain Review')).toHaveCount(0)
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Love this website' })).toBeDisabled()
})

test('a catalogue card opens the website inline without the footer', async ({ page }) => {
  await page.goto('/#/')
  await page.getByRole('link', { name: 'Discover Rain Mirage' }).click()

  await expect(page.locator('iframe')).toHaveAttribute('src', 'https://rainmirage.neocities.org/')
  await expect(page.getByRole('link', { name: 'Open original website in new tab' })).toHaveAttribute('target', '_blank')
  await expect(page.locator('footer')).toHaveCount(0)
  await page.getByRole('link', { name: 'flukewheel home' }).click()
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.locator('footer')).toBeVisible()
})

test('the primary toolbar follows a useful keyboard order', async ({ page }) => {
  await page.goto('/#/')

  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'flukewheel home' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Add a website' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Bump!' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('combobox', { name: 'Discovery interest' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeFocused()
})

test('the selected database interest survives a refresh', async ({ page }) => {
  await page.goto('/#/')
  const interest = page.getByRole('combobox', { name: 'Discovery interest' })
  await expect(interest.getByRole('option', { name: 'Art' })).toBeAttached()

  await interest.selectOption({ label: 'Art' })
  const selectedId = await interest.inputValue()
  expect(selectedId).toMatch(/^[0-9a-f-]{36}$/i)
  await page.reload()

  await expect(interest).toHaveValue(selectedId)
})

test('an unknown website ID has a safe recovery state', async ({ page }) => {
  await page.goto('/#/viewer/not-a-real-website')

  await expect(
    page.getByRole('heading', { name: "That discovery isn't available." }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Return home' })).toBeVisible()
})

test('browser history preserves database category context around a viewer', async ({ page }) => {
  await page.goto('/#/')
  await page.getByRole('button', { name: /educational/i }).click()

  const categoryUrl = page.url()
  const selectedId = await page.getByRole('combobox', { name: 'Discovery interest' }).inputValue()
  expect(selectedId).toMatch(/^[0-9a-f-]{36}$/i)
  expect(categoryUrl).toContain(`#/category/${selectedId}`)
  await page.locator('.card-carousel .card-link').first().click()
  const viewerUrl = page.url()
  expect(viewerUrl).toMatch(/#\/viewer\/[0-9a-f-]{36}$/i)

  await page.goBack()
  await expect(page).toHaveURL(categoryUrl)
  await expect(page.getByRole('combobox', { name: 'Discovery interest' })).toHaveValue(
    selectedId,
  )

  await page.goForward()
  await expect(page).toHaveURL(viewerUrl)
})

test('Bump remembers seen sites across a refresh', async ({ page }) => {
  await page.goto('/#/')
  const visited = new Set<string>()
  for (let index = 0; index < 20; index += 1) {
    const previousUrl = page.url()
    await page.getByRole('button', { name: 'Bump!' }).click()
    await expect(page).not.toHaveURL(previousUrl)
    await expect(page).toHaveURL(/#\/viewer\/[0-9a-f-]{36}$/i)
    const id = page.url().split('/').at(-1)!
    expect(visited.has(id)).toBe(false)
    visited.add(id)
    if (index === 9) await page.reload()
  }
  const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('flukewheel:discovery-session') ?? '{}'))
  expect(new Set(stored.seenWebsiteIds).size).toBe(20)
})

test('recent carousel advances and wraps to its first card', async ({ page }) => {
  await page.goto('/#/')
  const carousel = page.locator('.card-carousel')
  await expect(carousel.locator('.website-card')).toHaveCount(10)
  await expect.poll(() => carousel.evaluate((element) => element.scrollLeft), { timeout: 5000 }).toBeGreaterThan(0)
  await carousel.evaluate((element) => { element.scrollLeft = element.scrollWidth - element.clientWidth })
  await expect.poll(() => carousel.evaluate((element) => element.scrollLeft), { timeout: 5000 }).toBe(0)
})

test('private routes show an explicit unauthorised state', async ({ page }) => {
  await page.goto('/#/bookmarks')

  await expect(page.getByRole('heading', { name: 'Bookmarks are private.' })).toBeVisible()
  await expect(page.getByText('Log in to use this area.')).toBeVisible()
})
