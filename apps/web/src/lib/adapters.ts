import { categories as testCategories, websites as testWebsites } from '../features/discovery/data/fixtures'
import type { Database } from './database.types'
import { getSupabaseClient } from './supabase'
import type { Category, WebsiteSummary } from './types'

type WebsiteRow = Database['public']['Tables']['websites']['Row']
type PublicWebsiteRow = Pick<
  WebsiteRow,
  | 'id'
  | 'original_url'
  | 'title'
  | 'description'
  | 'thumbnail_path'
  | 'approved_at'
>

const websiteColumns =
  'id, original_url, title, description, thumbnail_path, approved_at'
const accents: Record<string, string> = {
  educational: '#f5c66f',
  funny: '#f0a6b8',
  art: '#b69ad9',
  free: '#8fc7b5',
}
const placeholderGradients = [
  'linear-gradient(135deg, #263a58, #7ab8d1)',
  'linear-gradient(135deg, #563333, #d68c75)',
  'linear-gradient(135deg, #3d2d59, #ae87d4)',
  'linear-gradient(135deg, #1d4b46, #73c6a6)',
]

function clientOrThrow() {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase project configuration is missing.')
  return client
}

function addedLabel(approvedAt: string | null) {
  if (!approvedAt) return 'Recently added'
  const days = Math.floor((Date.now() - new Date(approvedAt).getTime()) / 86_400_000)
  if (days <= 0) return 'Added today'
  if (days === 1) return 'Added yesterday'
  return 'Recently added'
}

function displayDomain(originalUrl: string) {
  const url = new URL(originalUrl)
  return url.host + (url.pathname === '/' ? '' : url.pathname.replace(/\/$/, ''))
}

async function categoryNamesFor(websiteIds: string[]) {
  const client = clientOrThrow()
  if (websiteIds.length === 0) return new Map<string, string[]>()

  const { data: links, error: linksError } = await client
    .from('website_categories')
    .select('website_id, category_id')
    .in('website_id', websiteIds)
  if (linksError) throw linksError

  const categoryIds = [...new Set((links ?? []).map((link) => link.category_id))]
  if (categoryIds.length === 0) return new Map<string, string[]>()

  const { data: categoryRows, error: categoryError } = await client
    .from('categories')
    .select('id, display_name')
    .in('id', categoryIds)
  if (categoryError) throw categoryError

  const nameById = new Map((categoryRows ?? []).map((row) => [row.id, row.display_name]))
  const namesByWebsite = new Map<string, string[]>()
  for (const link of links ?? []) {
    const name = nameById.get(link.category_id)
    if (!name) continue
    namesByWebsite.set(link.website_id, [...(namesByWebsite.get(link.website_id) ?? []), name])
  }
  return namesByWebsite
}

function toWebsiteSummary(
  row: PublicWebsiteRow,
  categories: string[],
): WebsiteSummary {
  const paletteIndex = Number.parseInt(row.id.slice(-2), 16) % placeholderGradients.length
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    originalUrl: row.original_url,
    displayDomain: displayDomain(row.original_url),
    categories,
    image: placeholderGradients[paletteIndex],
    addedLabel: addedLabel(row.approved_at),
  }
}

function shouldUseTestFixtures() {
  return import.meta.env.MODE === 'test'
}

export const catalogueAdapter = {
  listRecent: async (): Promise<WebsiteSummary[]> => {
    if (shouldUseTestFixtures()) return testWebsites

    const client = clientOrThrow()
    const { data, error } = await client
      .from('websites')
      .select(websiteColumns)
      .order('approved_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(24)
    if (error) throw error

    const names = await categoryNamesFor((data ?? []).map((row) => row.id))
    return (data ?? []).map((row) => toWebsiteSummary(row, names.get(row.id) ?? []))
  },

  listCategories: async (): Promise<Category[]> => {
    if (shouldUseTestFixtures()) return testCategories

    const client = clientOrThrow()
    const { data, error } = await client
      .from('categories')
      .select('id, slug, display_name, description')
      .order('display_order', { ascending: true })
      .order('id', { ascending: true })
    if (error) throw error
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.display_name,
      description: row.description,
      accent: accents[row.slug] ?? '#b69ad9',
    }))
  },

  getById: async (id: string): Promise<WebsiteSummary | null> => {
    if (shouldUseTestFixtures()) return testWebsites.find((website) => website.id === id) ?? null
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return null
    }

    const client = clientOrThrow()
    const { data, error } = await client
      .from('websites')
      .select(websiteColumns)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!data) return null

    const names = await categoryNamesFor([id])
    return toWebsiteSummary(data, names.get(id) ?? [])
  },
}

export const discoveryAdapter = {
  // Phase 2 keeps guest selection on the client. Phase 6 replaces this with
  // the bounded server selection contract and recorded member history.
  bump: async (
    interestId: string,
    recentIds: string[],
  ): Promise<WebsiteSummary | null> => {
    const [websites, categories] = await Promise.all([
      catalogueAdapter.listRecent(),
      catalogueAdapter.listCategories(),
    ])
    const selected = categories.find((category) => category.id === interestId)
    const matching = websites.filter(
      (website) => !selected || website.categories.includes(selected.name),
    )
    const unseen = matching.filter((website) => !recentIds.includes(website.id))
    const pool = unseen.length > 0 ? unseen : matching
    return pool[Math.floor(Math.random() * pool.length)] ?? null
  },
}

export type { Category, WebsiteSummary }
