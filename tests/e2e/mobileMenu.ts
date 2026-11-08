import type { Page } from '@playwright/test'

export async function showMobileMenu(page: Page) {
  await page.getByRole('button', { name: 'Wheel', exact: true }).waitFor()
  const trigger = page.getByRole('button', { name: 'More options' })
  if (await trigger.count() && await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click()
}
