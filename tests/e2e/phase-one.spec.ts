import { expect, test } from '@playwright/test'
import { showMobileMenu } from './mobileMenu'

test('homepage reads the public catalogue and keeps the viewer unmounted', async ({ page }, testInfo) => {
  await page.goto('/#/')

  if (testInfo.project.name === 'mobile') await expect(page.getByRole('link', { name: 'flukewheel home' })).toBeHidden()
  else await expect(page.getByRole('link', { name: 'flukewheel home' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Wheel', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'internet as an art.' })).toBeVisible()
  await expect(page.getByText('It never got smaller or less interesting, you just became held down by the commerce of things.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recently added' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'For you' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Explore categories' })).toBeVisible()
  await expect(page.locator('.card-carousel .website-card')).toHaveCount(10)
  const recentCard = page.locator('.card-carousel .website-card').first()
  await expect(recentCard.getByRole('button', { name: /Take a look at/ })).toBeVisible()
  await expect(recentCard.locator('.website-card__meta')).toHaveCount(0)
  expect(await recentCard.locator('.website-card__body').evaluate((body) => [...body.children].map((child) => child.tagName))).toEqual(['H3', 'P', 'BUTTON'])
  const cardBounds = (await recentCard.boundingBox())!
  const imageBounds = (await recentCard.locator('.website-card__art').boundingBox())!
  expect(cardBounds.height).toBeGreaterThanOrEqual(260)
  expect(cardBounds.height).toBeLessThan(290)
  expect(Math.abs(imageBounds.height - cardBounds.height)).toBeLessThanOrEqual(2)
  expect(await recentCard.evaluate((card) => getComputedStyle(card).fontFamily)).toContain('Space Mono Local')
  await expect(page.getByText('made with')).toBeVisible()
  await expect(page.getByText('Fresh finds')).toHaveCount(0)
  await expect(page.getByText('The Public Domain Review')).toHaveCount(0)
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Love this website' })).toBeDisabled()
})

test('a catalogue card opens the website inline without the footer', async ({ page }, testInfo) => {
  await page.goto('/#/')
  await page.locator('.card-carousel .card-link').first().click()

  await expect(page).toHaveURL(/#\/viewer\/[0-9a-f-]{36}$/i)
  await expect(page.locator('iframe')).toHaveAttribute('src', /^https?:\/\//)
  await showMobileMenu(page)
  await expect(page.getByRole('button', { name: 'Open original website' })).toBeEnabled()
  await expect(page.locator('footer')).toHaveCount(0)
  if (testInfo.project.name === 'mobile') await page.goBack()
  else await page.getByRole('link', { name: 'flukewheel home' }).click()
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.locator('footer')).toBeVisible()
})

test('a site that blocks embedding is still attempted in the viewer', async ({ page }) => {
  await page.goto('/#/viewer/20000000-0000-4000-8000-000000000118')

  await expect(page.locator('iframe')).toHaveAttribute('src', 'https://www.foodnotbombs.net/a.%20Anarchist%20Cookbook%20interior%207-30-15-1.pdf')
  await expect(page.getByText('A discovery to open')).toHaveCount(0)
  await showMobileMenu(page)
  await expect(page.getByRole('button', { name: 'Open original website' })).toBeEnabled()
})

test('the primary toolbar follows a useful keyboard order', async ({ page }, testInfo) => {
  await page.goto(testInfo.project.name === 'mobile' ? '/#/viewer/20000000-0000-4000-8000-000000000115' : '/#/')
  if (testInfo.project.name === 'mobile') await expect(page.getByRole('button', { name: 'Love this website' })).toBeEnabled()
  if (testInfo.project.name === 'mobile') await expect(page.getByRole('link', { name: 'flukewheel home' })).toBeHidden()
  else await expect(page.getByRole('link', { name: 'flukewheel home' })).toBeVisible()

  const skip = page.getByRole('link', { name: 'Skip to main content' })
  await skip.focus()
  await expect(skip).toBeFocused()
  if (testInfo.project.name !== 'mobile') {
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'flukewheel home' })).toBeFocused()
  }
  if (testInfo.project.name === 'mobile') {
    for (const name of ['Wheel', 'Love this website', 'Bookmark this website', 'More options']) {
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name })).toBeFocused()
    }
  } else {
    for (const name of ['Add a website', 'Wheel', 'Discovery interest', 'Log in']) {
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name, exact: true })).toBeFocused()
    }
  }
})

test('the selected database interest survives a refresh', async ({ page }) => {
  await page.goto('/#/')
  const interest = page.getByRole('button', { name: 'Discovery interest' })
  await showMobileMenu(page)
  await interest.click()
  await expect(page.locator('.interest-selector__grid .interest-option')).toHaveCount(20)
  await page.getByRole('button', { name: 'Arts, Design & Crafts' }).click()
  const selectedId = page.url().split('/category/')[1]
  expect(selectedId).toMatch(/^[0-9a-f-]{36}$/i)
  await page.reload()

  await showMobileMenu(page)
  await expect(interest).toContainText('Arts, Design & Crafts')
})

test('interest picker shows icons, responds to hover and closes with Escape', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/#/')
  const trigger = page.getByRole('button', { name: 'Discovery interest' })
  await showMobileMenu(page)
  if (testInfo.project.name !== 'mobile') {
    expect(await trigger.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
    expect(await trigger.evaluate((element) => getComputedStyle(element).borderColor)).toBe('rgba(0, 0, 0, 0)')
    await trigger.hover()
    expect(await trigger.evaluate((element) => getComputedStyle(element).borderColor)).not.toBe('rgba(0, 0, 0, 0)')
  }
  await trigger.click()
  const grid = page.locator('.interest-selector__grid')
  const panel = page.locator('.interest-selector__panel')
  expect(await panel.evaluate((element) => getComputedStyle(element).backdropFilter)).toContain('blur(34px)')
  expect(await page.locator('.topbar').evaluate((element) => getComputedStyle(element).backdropFilter)).toBe('none')
  await expect(grid.locator('.interest-option')).toHaveCount(20)
  await expect(grid.locator('.interest-option svg')).toHaveCount(20)
  const bounds = await panel.boundingBox()
  expect(bounds).not.toBeNull()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  const columns = await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)
  expect(columns).toBe(3)
  const food = grid.getByRole('button', { name: 'Food, Cooking' })
  const before = await food.evaluate((element) => getComputedStyle(element).backgroundColor)
  await food.hover()
  await expect.poll(() => food.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(before)
  await page.keyboard.press('Escape')
  await expect(grid).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await trigger.click()
  await grid.getByRole('button', { name: 'Food, Cooking' }).click()
  await expect(page).toHaveURL(/#\/category\/[0-9a-f-]{36}$/i)
  await showMobileMenu(page)
  await expect(trigger).toContainText('Food, Cooking')
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
  await page.getByRole('link', { name: /Education, Learning/ }).click()

  const categoryUrl = page.url()
  const selectedId = categoryUrl.split('/category/')[1]
  expect(selectedId).toMatch(/^[0-9a-f-]{36}$/i)
  expect(categoryUrl).toContain(`#/category/${selectedId}`)
  await page.locator('.card-grid .card-link').first().click()
  const viewerUrl = page.url()
  expect(viewerUrl).toMatch(/#\/viewer\/[0-9a-f-]{36}$/i)

  await page.goBack()
  await expect(page).toHaveURL(categoryUrl)
  await showMobileMenu(page)
  await expect(page.getByRole('button', { name: 'Discovery interest' })).toContainText('Education, Learning')

  await page.goForward()
  await expect(page).toHaveURL(viewerUrl)
})

test('Bump remembers seen sites across a refresh', async ({ page }) => {
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (request.isNavigationRequest() && request.frame().parentFrame()) await route.abort()
    else await route.continue()
  })
  await page.goto('/#/')
  const visited = new Set<string>()
  for (let index = 0; index < 20; index += 1) {
    const previousUrl = page.url()
    await page.getByRole('button', { name: 'Wheel', exact: true }).click()
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
