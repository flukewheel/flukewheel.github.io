import { expect, test } from '@playwright/test'
import { showMobileMenu } from './mobileMenu'

test('home Spin the Wheel callout sits between welcome and recent and opens a discovery', async ({ page }) => {
  await page.route('**/functions/v1/bump-website', async (route) => {
    const requestId = route.request().postDataJSON().request_id as string
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      request_id: requestId,
      selection_id: '30000000-0000-4000-8000-000000000001',
      website: {
        id: '20000000-0000-4000-8000-000000000115',
        title: 'Rain Mirage', description: 'An independent Neocities website.',
        original_url: 'https://rainmirage.neocities.org/', thumbnail_url: null,
        category_ids: [], delivery_mode: 'inline',
      },
      exclusions_relaxed: false,
    }) })
  })
  await page.goto('/#/')
  const welcome = page.getByRole('region', { name: 'internet as an art.' })
  const spin = page.getByRole('region', { name: 'Spin the Wheel!' })
  const recent = page.getByRole('region', { name: 'Recently added' })
  await expect(spin).toBeVisible()
  await expect(spin.getByText('Tap the wheel and be a frontiersman! Just do it you wuss!')).toBeVisible()
  const positions = await Promise.all([welcome, spin, recent].map(async (section) => (await section.boundingBox())!.y))
  expect(positions).toEqual([...positions].sort((a, b) => a - b))
  const colors = await spin.evaluate((section) => ({
    background: getComputedStyle(section).backgroundColor,
    text: getComputedStyle(section).color,
    heading: getComputedStyle(document.getElementById('welcome-heading')!).color,
    page: getComputedStyle(document.documentElement).backgroundColor,
  }))
  expect(colors.background).toBe(colors.heading)
  expect(colors.text).toBe(colors.page)
  await expect(spin.locator('.spin-section__arrow')).toBeVisible()
  const largeWheel = spin.getByRole('button', { name: 'Spin the Wheel' })
  await expect(largeWheel).not.toHaveAttribute('title')
  const motion = await spin.evaluate((section) => ({
    arrow: getComputedStyle(section.querySelector('.spin-section__arrow')!).animationDuration,
    wheel: getComputedStyle(section.querySelector('.wheel-button')!).animationDuration,
    swoop: getComputedStyle(section, '::before').animationDuration,
  }))
  expect(motion).toEqual({ arrow: '4s', wheel: '4s', swoop: '4s' })
  await page.addStyleTag({ content: '.spin-section__arrow, .spin-section .wheel-button { animation: none !important; }' })
  const [sectionBox, textBox, arrowBox, wheelBox] = await Promise.all([
    spin, spin.locator('.spin-section__copy'), spin.locator('.spin-section__arrow'), largeWheel,
  ].map(async (element) => (await element.boundingBox())!))
  const left = textBox.x - sectionBox.x
  const right = sectionBox.x + sectionBox.width - wheelBox.x - wheelBox.width
  const top = wheelBox.y - sectionBox.y
  expect(Math.abs(left - right)).toBeLessThan(1)
  expect(textBox.y).toBeGreaterThanOrEqual(sectionBox.y)
  expect(textBox.y + textBox.height).toBeLessThanOrEqual(sectionBox.y + sectionBox.height)
  expect(Math.abs(right - top)).toBeLessThan(1)
  expect(Math.abs((arrowBox.x - textBox.x - textBox.width) - (wheelBox.x - arrowBox.x - arrowBox.width))).toBeLessThan(1)
  await expect(largeWheel.locator('img')).toHaveAttribute('src', /icon\.png$/)
  expect((await largeWheel.boundingBox())!.width).toBeGreaterThan((await page.getByRole('button', { name: 'Wheel', exact: true }).boundingBox())!.width * 1.4)
  const icon = largeWheel.locator('img')
  const before = await icon.getAttribute('style')
  await page.waitForTimeout(250)
  expect(await icon.getAttribute('style')).not.toBe(before)
  await largeWheel.click()
  await expect(page).toHaveURL(/#\/viewer\/[0-9a-f-]{36}$/i)
  await expect(page.locator('.viewer-shell iframe')).toHaveAttribute('aria-label', 'Rain Mirage website')
  await expect(page.locator('.viewer-shell iframe')).not.toHaveAttribute('title')
})

test('submission and authentication dialogs trap focus and restore it on Escape', async ({ page }) => {
  await page.goto('/#/')

  const add = page.getByRole('button', { name: 'Add a website' })
  await showMobileMenu(page)
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
  await showMobileMenu(page)
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
  await page.getByRole('button', { name: 'Wheel', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Please try again in a minute.')
  await page.getByRole('button', { name: 'Wheel', exact: true }).click()
  await expect(page).toHaveURL(/#\/viewer\/[0-9a-f-]{36}$/i)
  expect(attempts).toBe(2)
})

test('narrow layout and reduced motion keep controls usable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/')
  await page.getByRole('heading', { name: 'Recently added' }).waitFor()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  const spin = page.locator('.spin-section')
  const reducedMotion = await spin.evaluate((section) => ({
    arrow: getComputedStyle(section.querySelector('.spin-section__arrow')!).animationIterationCount,
    wheel: getComputedStyle(section.querySelector('.wheel-button')!).animationIterationCount,
    swoop: getComputedStyle(section, '::before').animationIterationCount,
  }))
  expect(reducedMotion).toEqual({ arrow: '1', wheel: '1', swoop: '1' })
  const wheel = page.getByRole('button', { name: 'Wheel', exact: true })
  const icon = wheel.locator('img')
  const before = await icon.evaluate((element) => getComputedStyle(element).transform)
  await page.waitForTimeout(120)
  expect(await icon.evaluate((element) => getComputedStyle(element).transform)).toBe(before)

  await showMobileMenu(page)
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
    page.getByRole('button', { name: 'Wheel', exact: true }),
    page.getByRole('button', { name: 'Love this website' }),
    page.getByRole('button', { name: 'Bookmark this website' }),
    page.getByRole('button', { name: 'More options' }),
  ]
  const positions = await Promise.all(controls.map(async (control) => {
    await expect(control).toBeVisible()
    return (await control.boundingBox())!.x
  }))
  expect(positions).toEqual([...positions].sort((a, b) => a - b))
  for (const control of controls) expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(48)
  await expect(page.locator('.topbar button')).toHaveCount(4)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)

  await page.goto('/#/viewer/20000000-0000-4000-8000-000000000115')
  await page.locator('.viewer-shell iframe').waitFor()
  await controls[3].click()
  await expect(page.getByRole('button', { name: 'Add a website' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open original website' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Dislike this website' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
  await page.mouse.click(319, 100)
  await expect(page.locator('.mobile-menu__panel')).toHaveCount(0)
  await controls[3].click()
  await page.getByRole('button', { name: 'Discovery interest' }).click()
  const panel = page.locator('.interest-selector__panel')
  await expect(panel.locator('.interest-selector__grid .interest-option')).toHaveCount(20)
  const columns = await panel.locator('.interest-selector__grid').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)
  expect(columns).toBe(3)
  const panelBounds = await panel.boundingBox()
  expect(panelBounds!.y + panelBounds!.height).toBeLessThan(navBounds!.y)
  await page.mouse.click(319, 100)
  await expect(panel).toHaveCount(0)
  await expect(page.locator('.mobile-menu__panel')).toHaveCount(0)
})
