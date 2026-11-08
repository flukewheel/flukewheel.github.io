import { chromium, devices } from '@playwright/test'

const url = process.argv[2] ?? 'http://127.0.0.1:4173/#/'
const runs = Number(process.argv[3] ?? 5)
if (!Number.isInteger(runs) || runs < 1 || runs > 20) throw new Error('Choose 1–20 runs.')

const browser = await chromium.launch()
const samples = []
try {
  for (let index = 0; index < runs; index += 1) {
    const context = await browser.newContext({ ...devices['Pixel 7'] })
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150, downloadThroughput: 1_600_000 / 8,
      uploadThroughput: 750_000 / 8,
    })
    await page.addInitScript(() => {
      const state = { lcp: 0, cls: 0 }
      Object.assign(window, { __phase8Vitals: state })
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) state.lcp = entry.startTime
      }).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) state.cls += entry.value
        }
      }).observe({ type: 'layout-shift', buffered: true })
    })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(url, { waitUntil: 'load', timeout: 30_000 })
    await page.getByRole('heading', { name: 'Recently added' }).waitFor({ timeout: 20_000 })
    await page.waitForTimeout(2000)
    const vital = await page.evaluate(() => window.__phase8Vitals)
    if (errors.length || !vital?.lcp) throw new Error(`Run ${index + 1}: ${errors.join('; ') || 'LCP missing'}`)
    samples.push({ lcpMs: Math.round(vital.lcp), cls: Number(vital.cls.toFixed(4)) })
    await context.close()
  }
} finally {
  await browser.close()
}

const percentile = (values, portion) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * portion) - 1]
console.log(JSON.stringify({
  url, profile: 'Pixel 7 viewport, 4x CPU, 1.6 Mbps down, 0.75 Mbps up, 150 ms latency',
  samples,
  lcpP75Ms: percentile(samples.map((sample) => sample.lcpMs), 0.75),
  clsMax: Math.max(...samples.map((sample) => sample.cls)),
}, null, 2))
