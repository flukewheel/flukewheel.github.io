import type { Category, WebsiteSummary } from './types'

export interface DiscoverySelection {
  website: WebsiteSummary
  resetCycle: boolean
}

export function selectNextDiscovery(
  websites: WebsiteSummary[],
  categories: Category[],
  interestId: string,
  seenIds: string[],
  random = Math.random,
): DiscoverySelection | null {
  if (websites.length === 0) return null

  const seen = new Set(seenIds)
  const unseen = websites.filter((website) => !seen.has(website.id))
  const resetCycle = unseen.length === 0
  const previousId = seenIds.at(-1)
  const candidates = resetCycle && websites.length > 1
    ? websites.filter((website) => website.id !== previousId)
    : resetCycle ? websites : unseen
  const interest = categories.find((category) => category.id === interestId)
  const matching = interest
    ? candidates.filter((website) => website.categories.includes(interest.name))
    : candidates
  const pool = matching.length > 0 ? matching : candidates
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length))

  return { website: pool[index], resetCycle }
}
