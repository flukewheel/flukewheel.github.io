import { expect, test } from '@playwright/test'

test('submission and authentication dialogs trap focus and restore it on Escape', async ({ page }) => {
  await page.goto('/#/')

  const add = page.getByRole('button', { name: 'Add a website' })
  await add.click()
  const submission = page.getByRole('dialog', { name: 'Suggest a website' })
  const closeSubmission = submission.getByRole('button', { name: 'Close website submission' })
  await expect(closeSubmission).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(submission.getByRole('button', { name: 'Send suggestion' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(submission).toHaveCount(0)
  await expect(add).toBeFocused()

  const login = page.getByRole('button', { name: 'Log in', exact: true })
  await login.click()
  const auth = page.getByRole('dialog', { name: 'Log in to flukewheel' })
  const closeAuth = auth.getByRole('button', { name: 'Close authentication' })
  await expect(closeAuth).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(auth.getByRole('button', { name: 'Forgot password?' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(auth).toHaveCount(0)
  await expect(login).toBeFocused()
})

test('a rate-limited Wheel shows a useful error and can retry', async ({ page }) => {
  let attempts = 0
  await page.route('**/functions/v1/bump-website', async (route) => {
    attempts += 1
    if (attempts === 1) {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: { 'Retry-After': '60' },
        body: JSON.stringify({ code: 'RATE_LIMITED', request_id: crypto.randomUUID() }),
      })
    } else await route.continue()
  })
  await page.goto('/#/')
  await page.getByRole('button', { name: 'Wheel' }).click()
  await expect(page.getByRole('alert')).toContainText('Please try again in a minute.')
  await page.getByRole('button', { name: 'Wheel' }).click()
  await expect(page).toHaveURL(/#\/viewer\/[0-9a-f-]{36}$/i)
  expect(attempts).toBe(2)
})

test('narrow layout and reduced motion keep controls usable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/')
  await page.getByRole('heading', { name: 'Recently added' }).waitFor()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  const wheel = page.getByRole('button', { name: 'Wheel' })
  const icon = wheel.locator('img')
  const before = await icon.evaluate((element) => getComputedStyle(element).transform)
  await page.waitForTimeout(120)
  expect(await icon.evaluate((element) => getComputedStyle(element).transform)).toBe(before)

  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  const email = page.getByRole('dialog', { name: 'Log in to flukewheel' }).getByRole('textbox', { name: 'Email address' })
  await email.focus()
  expect(await email.evaluate((element) => getComputedStyle(element).outlineWidth)).toBe('3px')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})

test('mobile navigation stays on one bottom row and the interest menu closes over the viewer', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile')
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/#/')
  const nav = page.locator('.topbar')
  const navBounds = await nav.boundingBox()
  expect(navBounds).not.toBeNull()
  expect(Math.abs(navBounds!.y + navBounds!.height - 640)).toBeLessThan(2)
  await expect(page.getByRole('link', { name: 'flukewheel home' })).toBeHidden()
  const controls = [
    page.getByRole('button', { name: 'Add a website' }),
    page.getByRole('button', { name: 'Wheel' }),
    page.getByRole('button', { name: 'Discovery interest' }),
    page.getByRole('button', { name: 'Log in', exact: true }),
  ]
  const positions = await Promise.all(controls.map(async (control) => {
    await expect(control).toBeVisible()
    return (await control.boundingBox())!.x
  }))
  expect(positions).toEqual([...positions].sort((a, b) => a - b))
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)

  await page.goto('/#/viewer/20000000-0000-4000-8000-000000000115')
  await page.locator('.viewer-shell iframe').waitFor()
  await controls[2].click()
  const panel = page.locator('.interest-selector__panel')
  await expect(panel.locator('.interest-selector__grid .interest-option')).toHaveCount(20)
  const columns = await panel.locator('.interest-selector__grid').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)
  expect(columns).toBe(3)
  const panelBounds = await panel.boundingBox()
  expect(panelBounds!.y + panelBounds!.height).toBeLessThan(navBounds!.y)
  await page.mouse.click(319, 100)
  await expect(panel).toHaveCount(0)
})
