import { chromium } from '@playwright/test'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const input = process.argv[2] ?? 'supabase/catalogue/2026-10-30-requested.txt'
const output = process.argv[3] ?? 'test-results/catalogue-embed-audit.json'
const urls = (await readFile(input, 'utf8')).split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
const results = Array(urls.length)
const browser = await chromium.launch({ headless: true })
let next = 0

async function worker() {
  while (next < urls.length) {
    const index = next++
    const url = urls[index]
    const page = await browser.newPage({ ignoreHTTPSErrors: true })
    const failures = []
    const consoleErrors = []
    page.on('requestfailed', (request) => {
      if (request.isNavigationRequest()) failures.push(`${request.failure()?.errorText}: ${request.url().slice(0, 140)}`)
    })
    page.on('console', (message) => {
      if (message.type() === 'error' && /frame|refused to display|mixed content/i.test(message.text())) {
        consoleErrors.push(message.text().slice(0, 200))
      }
    })
    try {
      await page.goto('https://flukewheel.github.io/', { waitUntil: 'domcontentloaded', timeout: 20_000 })
      await page.evaluate((frameUrl) => {
        document.body.replaceChildren()
        const frame = document.createElement('iframe')
        frame.setAttribute('sandbox', 'allow-forms allow-scripts allow-same-origin')
        frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
        frame.src = frameUrl
        document.body.append(frame)
      }, url)
      await page.waitForTimeout(3_000)
      const frame = page.frames().find((item) => item.parentFrame() === page.mainFrame())
      let bodyLength = 0
      try { bodyLength = (await frame.locator('body').innerText({ timeout: 1_000 })).length } catch { /* Canvas and PDF pages may have no body text. */ }
      results[index] = { url, frameUrl: frame?.url() ?? '', bodyLength, failures, consoleErrors }
    } catch (error) {
      results[index] = { url, error: String(error?.message ?? error), failures, consoleErrors }
    } finally {
      await page.close()
    }
  }
}

try {
  await Promise.all(Array.from({ length: 6 }, worker))
} finally {
  await browser.close()
}
await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, JSON.stringify(results, null, 2) + '\n')
console.log(JSON.stringify({ total: urls.length, blocked: results.filter((r) => r.failures?.some((f) => f.includes('ERR_BLOCKED_BY_RESPONSE'))).length, errors: results.filter((r) => r.error).length, output }))
