import { describe, expect, it } from 'vitest'
import type { Category, WebsiteSummary } from './types'
import { selectNextDiscovery } from './discoverySelection'

const categories: Category[] = [
  { id: 'art', slug: 'art', name: 'Art', description: '', accent: '' },
]
const websites = Array.from({ length: 109 }, (_, index): WebsiteSummary => ({
  id: `site-${index}`,
  title: `Site ${index}`,
  description: '',
  originalUrl: `https://example.com/${index}`,
  displayDomain: 'example.com',
  categories: index < 2 ? ['Art'] : ['Educational'],
  image: '',
  addedLabel: '',
}))

describe('discovery selection', () => {
  it('visits the complete catalogue before repeating, including beyond the old 20-site cap', () => {
    let seen: string[] = []
    for (let index = 0; index < websites.length; index += 1) {
      const selection = selectNextDiscovery(websites, categories, 'art', seen, () => 0)
      expect(selection).not.toBeNull()
      expect(selection?.resetCycle).toBe(false)
      expect(seen).not.toContain(selection?.website.id)
      seen = [...seen, selection!.website.id]
    }
    expect(new Set(seen).size).toBe(websites.length)
    const nextCycle = selectNextDiscovery(websites, categories, 'art', seen, () => 0)
    expect(nextCycle?.resetCycle).toBe(true)
    expect(nextCycle?.website.id).not.toBe(seen.at(-1))
  })

  it('returns an empty result for an empty catalogue', () => {
    expect(selectNextDiscovery([], categories, 'all', [], () => 0)).toBeNull()
  })
})
