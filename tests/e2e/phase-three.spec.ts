import { expect, test } from '@playwright/test'

test('local account keeps a guest bookmark on the original website after sign-in', async ({ page }) => {
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (request.isNavigationRequest() && request.frame().parentFrame()) await route.abort()
    else await route.continue()
  })
  const email = `phase3-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`
  const password = 'FlukewheelTestPassword42!'
  const websiteId = '20000000-0000-4000-8000-000000000115'

  await page.goto('/#/')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign up', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Choose a username' })).toBeVisible()
  await page.getByRole('button', { name: 'Not now' }).click()
  await expect(page.getByRole('button', { name: `Account menu for ${email.split('@')[0]}` })).toBeVisible()

  await page.getByRole('button', { name: `Account menu for ${email.split('@')[0]}` }).click()
  await page.getByRole('menuitem', { name: 'Profile and interests' }).click()
  await expect(page.getByRole('heading', { name: 'Profile and interests' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Username' }).fill(`member_${Date.now()}`)
  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByText('Profile saved.')).toBeVisible()
  await page.getByLabel('Change profile picture').setInputFiles('../../icon.png')
  await expect(page.getByText('Profile picture updated.')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('img', { name: 'Your profile' })).toBeVisible()
  await expect.poll(() => page.getByRole('img', { name: 'Your profile' }).evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/rest/v1/user_interests') && response.request().method() === 'POST' && response.ok()),
    page.getByRole('checkbox', { name: 'Art' }).check(),
  ])
  await expect(page.getByRole('checkbox', { name: 'Art' })).toBeChecked()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('checkbox', { name: 'Art' })).toBeChecked()

  await page.getByRole('button', { name: /Account menu for member_/ }).click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()

  await page.goto(`/#/viewer/${websiteId}`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Love this website' }).click()
  await expect(page.getByRole('heading', { name: 'Log in to flukewheel' })).toBeVisible()
  await page.getByRole('button', { name: 'Close authentication' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Bookmark this website' }).click()
  await expect(page.getByRole('heading', { name: 'Log in to flukewheel' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click()
  await expect(page.getByRole('button', { name: 'Bookmark this website' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Love this website' })).not.toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Choose a dislike reason' }).click()
  await page.getByRole('menuitem', { name: 'Not interested' }).click()
  await expect(page.getByRole('button', { name: 'Dislike this website' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page).toHaveURL(new RegExp(`${websiteId}$`))
})

test('local password recovery returns to the static app entry', async ({ page, request }) => {
  const email = `recovery-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`
  const password = 'FlukewheelTestPassword42!'
  const nextPassword = 'FlukewheelChangedPassword43!'

  const viewerRoute = '/#/viewer/20000000-0000-4000-8000-000000000115'
  await page.goto(`http://127.0.0.1:5173${viewerRoute}`)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign up', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Choose a username' })).toBeVisible()
  await page.getByRole('button', { name: 'Not now' }).click()
  await expect(page.getByRole('button', { name: `Account menu for ${email.split('@')[0]}` })).toBeVisible()
  await page.getByRole('button', { name: `Account menu for ${email.split('@')[0]}` }).click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await page.getByRole('button', { name: 'Forgot password?' }).click()
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByText('If this address has an account, a password reset link is on its way.')).toBeVisible()

  let messageId = ''
  await expect.poll(async () => {
    const response = await request.get('http://127.0.0.1:54424/api/v1/messages')
    const listing = await response.json() as { messages: { ID: string; To: { Address: string }[] }[] }
    messageId = listing.messages.find((message) => message.To.some((recipient) => recipient.Address === email))?.ID ?? ''
    return Boolean(messageId)
  }).toBe(true)
  const response = await request.get(`http://127.0.0.1:54424/api/v1/message/${messageId}`)
  const message = await response.json() as { Text: string }
  const recoveryLink = message.Text.match(/https?:\/\/\S+/)?.[0]
  expect(recoveryLink).toBeTruthy()
  await page.goto(recoveryLink!, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`${viewerRoute.slice(3)}$`))
  await page.getByLabel('New password', { exact: true }).fill(nextPassword)
  await page.getByRole('button', { name: 'Save new password' }).click()
  await expect(page.getByText('Your password has been updated.')).toBeVisible()
})

test('new accounts complete a unique username without losing their discovery', async ({ page }) => {
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`
  const firstEmail = `first-${suffix}@example.test`
  const secondEmail = `second-${suffix}@example.test`
  const username = `member_${suffix}`.slice(0, 32)
  const alternative = `other_${suffix}`.slice(0, 32)
  const password = 'FlukewheelTestPassword42!'
  const viewerRoute = '/#/viewer/20000000-0000-4000-8000-000000000115'

  async function signUp(email: string) {
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await page.getByRole('button', { name: 'Create an account' }).click()
    await page.getByRole('textbox', { name: 'Email address' }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign up', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Choose a username' })).toBeVisible()
  }

  await page.goto(viewerRoute)
  await signUp(firstEmail)
  await page.getByRole('textbox', { name: 'Username' }).fill(username)
  await page.getByRole('button', { name: 'Save username' }).click()
  await expect(page.getByRole('button', { name: `Account menu for ${username}` })).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`${viewerRoute.slice(3)}$`))
  await page.getByRole('button', { name: `Account menu for ${username}` }).click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()

  await signUp(secondEmail)
  await page.getByRole('textbox', { name: 'Username' }).fill(username)
  await page.getByRole('button', { name: 'Save username' }).click()
  await expect(page.getByRole('alert')).toContainText('That username is already taken. Choose another.')
  await page.getByRole('textbox', { name: 'Username' }).fill(alternative)
  await page.getByRole('button', { name: 'Save username' }).click()
  await expect(page.getByRole('button', { name: `Account menu for ${alternative}` })).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: `Account menu for ${alternative}` })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('OAuth callback errors restore the viewer and interest without leaving callback parameters', async ({ page }) => {
  const viewerRoute = '#/viewer/20000000-0000-4000-8000-000000000115'
  await page.goto(`/${viewerRoute}`)
  await page.getByRole('combobox', { name: 'Discovery interest' }).selectOption({ label: 'Art' })
  await page.evaluate((route) => sessionStorage.setItem('flukewheel:auth-return', route), viewerRoute)
  await page.goto('/?error=access_denied')
  await expect(page.getByRole('heading', { name: 'Log in to flukewheel' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Authentication was cancelled or could not be completed.')
  await expect(page).toHaveURL(new RegExp(`${viewerRoute.slice(1)}$`))
  await expect(page.getByRole('combobox', { name: 'Discovery interest' })).toHaveValue('10000000-0000-4000-8000-000000000003')
})
