import { expect, test } from '@playwright/test'

test('homepage reads the public catalogue and keeps the viewer unmounted', async ({ page }) => {
  await page.goto('/#/')

  await expect(page.getByRole('link', { name: 'flukewheel home' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bump!' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recently added' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'For you' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Explore categories' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Discover Hypertext TV' })).toBeVisible()
  await expect(page.getByText('The Public Domain Review')).toHaveCount(0)
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Love this website' })).toBeDisabled()
})

test('an unverified catalogue card opens the external fallback', async ({ page }) => {
  await page.goto('/#/')
  await page.getByRole('link', { name: 'Discover Hypertext TV' }).click()

  await expect(page.getByRole('heading', { name: 'Hypertext TV' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open original website' })).toHaveAttribute(
    'href',
    'https://www.hypertext.tv',
  )
  await expect(page.locator('iframe')).toHaveCount(0)
  await page.getByRole('link', { name: 'flukewheel home' }).click()
  await expect(page.locator('iframe')).toHaveCount(0)
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
  await page.getByRole('link', { name: 'Discover MapTap' }).click()
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

test('private routes show an explicit unauthorised state', async ({ page }) => {
  await page.goto('/#/bookmarks')

  await expect(page.getByRole('heading', { name: 'Bookmarks are private.' })).toBeVisible()
  await expect(page.getByText('Log in to use this area.')).toBeVisible()
})
