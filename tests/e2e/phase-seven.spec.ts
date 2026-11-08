import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { showMobileMenu } from './mobileMenu'

test('member can revisit and clear Wheel history', async ({ page }) => {
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (request.isNavigationRequest() && request.frame().parentFrame()) await route.abort()
    else await route.continue()
  })
  const email = `phase7-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`

  await page.goto('/#/')
  await showMobileMenu(page)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('FlukewheelTestPassword42!')
  await page.getByRole('button', { name: 'Sign up', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Choose a username' })).toBeVisible()
  await page.getByRole('button', { name: 'Not now' }).click()

  await page.getByRole('button', { name: 'Wheel', exact: true }).click()
  await expect(page).toHaveURL(/#\/viewer\//)
  const viewerUrl = page.url()
  await showMobileMenu(page)
  await page.getByRole('button', { name: `Account menu for ${email.split('@')[0]}` }).click()
  await page.getByRole('menuitem', { name: 'Browsing history' }).click()
  await expect(page.getByRole('heading', { name: 'Browsing history' })).toBeVisible()
  await expect(page.getByText('Wheel discovery')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open in viewer' })).toHaveCount(1)
  await page.getByRole('link', { name: 'Open in viewer' }).click()
  await expect(page).toHaveURL(viewerUrl)

  await showMobileMenu(page)
  await page.getByRole('button', { name: `Account menu for ${email.split('@')[0]}` }).click()
  await page.getByRole('menuitem', { name: 'Browsing history' }).click()
  await expect(page.getByText('History revisit')).toBeVisible()

  await page.goto('/#/')
  await page.locator('.card-carousel .card-link').first().click()
  await expect(page).toHaveURL(/#\/viewer\//)
  await showMobileMenu(page)
  await page.getByRole('button', { name: `Account menu for ${email.split('@')[0]}` }).click()
  await page.getByRole('menuitem', { name: 'Browsing history' }).click()
  await expect(page.getByText('Catalogue card')).toBeVisible()

  await page.getByRole('link', { name: 'Open in viewer' }).first().click()
  await page.getByRole('button', { name: 'Bookmark this website' }).click()
  await expect(page.getByRole('button', { name: 'Bookmark this website' })).toHaveAttribute('aria-pressed', 'true')
  await showMobileMenu(page)
  await page.getByRole('button', { name: `Account menu for ${email.split('@')[0]}` }).click()
  await page.getByRole('menuitem', { name: 'Bookmarks' }).click()
  await page.getByRole('link', { name: 'Open in viewer' }).click()
  await showMobileMenu(page)
  await page.getByRole('button', { name: `Account menu for ${email.split('@')[0]}` }).click()
  await page.getByRole('menuitem', { name: 'Browsing history' }).click()
  await expect(page.getByText('Bookmark', { exact: true })).toBeVisible()

  await page.goto('/#/settings')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export my data' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('flukewheel-account-data.json')
  const exported = JSON.parse(await readFile(await download.path(), 'utf8')) as {
    account: { email: string }; history: Array<{ source: string }>; bookmarks: Array<{ website_id: string }>
  }
  expect(exported.account.email).toBe(email)
  expect(exported.history.map((entry) => entry.source)).toEqual(expect.arrayContaining(['bump', 'card', 'bookmark', 'history']))
  expect(exported.bookmarks).toHaveLength(1)

  await page.goto('/#/history')

  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(page.getByText('No discoveries in your history yet.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('No discoveries in your history yet.')).toBeVisible()
})

test('member can export then permanently delete a test account', async ({ page }) => {
  const email = `phase7-delete-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`
  const password = 'FlukewheelTestPassword42!'
  await page.goto('/#/')
  await showMobileMenu(page)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign up', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Choose a username' })).toBeVisible()
  await page.getByRole('button', { name: 'Not now' }).click()

  await page.goto('/#/settings')
  const deleteButton = page.getByRole('button', { name: 'Permanently delete account' })
  await expect(deleteButton).toBeDisabled()
  await page.getByRole('textbox', { name: 'Type your account email to confirm' }).fill('someone-else@example.test')
  await expect(deleteButton).toBeDisabled()
  await page.getByRole('textbox', { name: 'Type your account email to confirm' }).fill(email)
  await expect(deleteButton).toBeEnabled()

  page.once('dialog', (dialog) => void dialog.accept())
  const deletion = page.waitForResponse((response) => response.url().includes('/functions/v1/delete-account'))
  await deleteButton.click()
  expect((await deletion).status()).toBe(200)
  await showMobileMenu(page)
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
  await page.reload()
  await showMobileMenu(page)
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click()
  await expect(page.getByRole('alert')).toContainText('Invalid login credentials')
  await page.getByRole('button', { name: 'Close authentication' }).click()
  await showMobileMenu(page)
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: `Account menu for ${email.split('@')[0]}` })).toHaveCount(0)
})

test('failed member writes restore the previous website state', async ({ page }) => {
  const email = `phase7-failure-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (request.isNavigationRequest() && request.frame().parentFrame()) await route.abort()
    else await route.continue()
  })
  await page.goto('/#/')
  await showMobileMenu(page)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('FlukewheelTestPassword42!')
  await page.getByRole('button', { name: 'Sign up', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Choose a username' })).toBeVisible()
  await page.getByRole('button', { name: 'Not now' }).click()
  await page.goto('/#/viewer/20000000-0000-4000-8000-000000000115', { waitUntil: 'domcontentloaded' })

  await page.route('**/rest/v1/website_reactions**', async (route) => {
    if (route.request().method() === 'POST') {
      await new Promise((resolve) => setTimeout(resolve, 500))
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Write failed"}' })
    } else await route.continue()
  })
  const love = page.getByRole('button', { name: 'Love this website' })
  await expect(love).not.toHaveAttribute('aria-pressed', 'true')
  await love.click()
  await expect(love).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('alert')).toContainText('The action could not be saved.')
  await expect(love).not.toHaveAttribute('aria-pressed', 'true')

  await page.route('**/rest/v1/bookmarks**', async (route) => {
    if (route.request().method() === 'POST') {
      await new Promise((resolve) => setTimeout(resolve, 500))
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Save failed"}' })
    } else await route.continue()
  })
  const bookmark = page.getByRole('button', { name: 'Bookmark this website' })
  await expect(bookmark).not.toHaveAttribute('aria-pressed', 'true')
  await bookmark.click()
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('alert')).toContainText('The action could not be saved.')
  await expect(bookmark).not.toHaveAttribute('aria-pressed', 'true')
})

test('a reaction in flight stays attached to its original website after a Wheel discovery', async ({ page }) => {
  const email = `phase7-race-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`
  const originalId = '20000000-0000-4000-8000-000000000115'
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (request.isNavigationRequest() && request.frame().parentFrame()) await route.abort()
    else await route.continue()
  })
  await page.goto('/#/')
  await showMobileMenu(page)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByRole('textbox', { name: 'Email address' }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('FlukewheelTestPassword42!')
  await page.getByRole('button', { name: 'Sign up', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Choose a username' })).toBeVisible()
  await page.getByRole('button', { name: 'Not now' }).click()
  await page.goto(`/#/viewer/${originalId}`, { waitUntil: 'domcontentloaded' })

  await page.route('**/rest/v1/website_reactions**', async (route) => {
    if (route.request().method() === 'POST') await new Promise((resolve) => setTimeout(resolve, 800))
    await route.continue()
  })
  const love = page.getByRole('button', { name: 'Love this website' })
  await love.click()
  await expect(page.getByRole('group', { name: 'Website actions' })).toHaveAttribute('aria-busy', 'true')
  await page.getByRole('button', { name: 'Wheel', exact: true }).click()
  await expect(page).not.toHaveURL(new RegExp(`${originalId}$`))
  await expect(page.getByRole('group', { name: 'Website actions' })).toHaveAttribute('aria-busy', 'false')
  await expect(love).not.toHaveAttribute('aria-pressed', 'true')

  await page.goto(`/#/viewer/${originalId}`, { waitUntil: 'domcontentloaded' })
  await expect(love).toHaveAttribute('aria-pressed', 'true')
})
