import assert from 'node:assert/strict'
import test from 'node:test'
import { imageType, previewImageFromHtml, publicAddress } from '../supabase/functions/_shared/link-preview.ts'

test('prefers secure Open Graph image and resolves a relative URL', () => {
  const html = `<head><meta content="/ordinary.jpg" property="og:image"><meta property='og:image:secure_url' content='/images/cover.webp?x=1&amp;y=2'></head>`
  assert.equal(previewImageFromHtml(html, 'https://example.org/article'), 'https://example.org/images/cover.webp?x=1&y=2')
})

test('uses Twitter image when Open Graph is absent and ignores body tags', () => {
  assert.equal(previewImageFromHtml('<meta name="twitter:image" content="https://cdn.example.org/card.png"><body><meta property="og:image" content="bad">', 'https://example.org/'), 'https://cdn.example.org/card.png')
  assert.equal(previewImageFromHtml('<html><body><meta property="og:image" content="bad"></body></html>', 'https://example.org/'), null)
})

test('rejects private and reserved addresses', () => {
  for (const address of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '::1', 'fc00::1', '::ffff:127.0.0.1', '2001:db8::1']) {
    assert.equal(publicAddress(address), false, address)
  }
  for (const address of ['8.8.8.8', '2606:4700:4700::1111']) assert.equal(publicAddress(address), true, address)
})

test('recognises a GIF advertised as a standard link preview', () => {
  assert.deepEqual(imageType(new TextEncoder().encode('GIF89a')), { mime: 'image/gif', extension: 'gif' })
})
