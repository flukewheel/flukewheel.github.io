import { describe, expect, it } from 'vitest'
import { normaliseSubmissionUrl } from '../../../../supabase/functions/_shared/submission-url'

describe('website suggestion URL validation', () => {
  it('preserves meaningful paths and queries while removing tracking and fragments', () => {
    expect(normaliseSubmissionUrl('HTTPS://Example.COM:443/interesting/path?topic=art&utm_source=feed#section'))
      .toBe('https://example.com/interesting/path?topic=art')
  })

  it.each([
    'javascript:alert(1)',
    'https://user:pass@example.com/',
    'http://127.0.0.1/private',
    'http://[::1]/private',
    'http://localhost/private',
    'https://printer.local/',
    'https://example.com:8443/',
    'https://example.com\\@localhost/',
  ])('rejects unsafe destination %s', (url) => {
    expect(() => normaliseSubmissionUrl(url)).toThrow()
  })
})
