import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto('https://flukewheel.github.io/', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const carousel = page.getByLabel('Recently added websites')
  await carousel.locator('.website-card').first().waitFor({ timeout: 20_000 })
  const result = await carousel.evaluate(async (element) => {
    const images = [...element.querySelectorAll('img')]
    for (const image of images) image.loading = 'eager'
    await Promise.all(images.map((image) => image.decode().catch(() => null)))
    return {
      cards: element.querySelectorAll('.website-card').length,
      images: images.length,
      loaded: images.filter((image) => image.naturalWidth > 0).length,
      failures: images.filter((image) => image.naturalWidth === 0).map((image) => image.src),
    }
  })
  console.log(JSON.stringify(result))
  if (result.cards !== 10 || result.loaded === 0 || result.failures.length) process.exitCode = 1
} finally {
  await browser.close()
}
