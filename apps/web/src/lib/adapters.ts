import { categories as testCategories, websites as testWebsites } from '../features/discovery/data/fixtures'
import type { Database } from './database.types'
import { getSupabaseClient } from './supabase'
import { selectNextDiscovery } from './discoverySelection'
import { bumpResponseSchema } from '@flukewheel/contracts'
import { thumbnailIds } from './thumbnailIds'
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
  art: '#ff9800',
  free: '#8fc7b5',
}
const placeholderGradients = [
  'linear-gradient(135deg, #263a58, #7ab8d1)',
  'linear-gradient(135deg, #563333, #d68c75)',
  'linear-gradient(135deg, #67441b, #ffb048)',
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

  const links = []
  for (let offset = 0; offset < websiteIds.length; offset += 100) {
    const { data, error } = await client
      .from('website_categories')
      .select('website_id, category_id')
      .in('website_id', websiteIds.slice(offset, offset + 100))
    if (error) throw error
    links.push(...(data ?? []))
  }

  const categoryIds = [...new Set(links.map((link) => link.category_id))]
  if (categoryIds.length === 0) return new Map<string, string[]>()

  const { data: categoryRows, error: categoryError } = await client
    .from('categories')
    .select('id, display_name')
    .in('id', categoryIds)
  if (categoryError) throw categoryError

  const nameById = new Map((categoryRows ?? []).map((row) => [row.id, row.display_name]))
  const namesByWebsite = new Map<string, string[]>()
  for (const link of links) {
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
    thumbnailUrl: row.thumbnail_path
      ? clientOrThrow().storage.from('thumbnails').getPublicUrl(row.thumbnail_path).data.publicUrl
      : thumbnailIds.has(row.id) ? `${import.meta.env.BASE_URL}thumbnails/${row.id}.jpg` : null,
    addedLabel: addedLabel(row.approved_at),
  }
}

async function summariesFor(rows: PublicWebsiteRow[]): Promise<WebsiteSummary[]> {
  const names = await categoryNamesFor(rows.map((row) => row.id))
  return rows.map((row) => toWebsiteSummary(row, names.get(row.id) ?? []))
}

function shouldUseTestFixtures() {
  return import.meta.env.MODE === 'test'
}

export const catalogueAdapter = {
  listRecent: async (): Promise<WebsiteSummary[]> => {
    if (shouldUseTestFixtures()) return testWebsites.slice(0, 10)

    const { data, error } = await clientOrThrow()
      .from('websites')
      .select(websiteColumns)
      .order('approved_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(10)
    if (error) throw error
    return summariesFor(data ?? [])
  },

  listPage: async (categoryId: string | null, offset: number, limit = 24) => {
    if (shouldUseTestFixtures()) {
      const category = testCategories.find((item) => item.id === categoryId)
      const matching = category ? testWebsites.filter((website) => website.categories.includes(category.name)) : testWebsites
      return { websites: matching.slice(offset, offset + limit), hasMore: matching.length > offset + limit }
    }

    const client = clientOrThrow()
    const base = categoryId
      ? client.from('websites').select(`${websiteColumns}, website_categories!inner(category_id)`)
        .eq('website_categories.category_id', categoryId)
      : client.from('websites').select(websiteColumns)
    const { data, error } = await base
      .order('approved_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit)
    if (error) throw error
    const rows = (data ?? []).slice(0, limit)
    return { websites: await summariesFor(rows), hasMore: (data?.length ?? 0) > limit }
  },

  listRecommendations: async (categoryId: string | null): Promise<WebsiteSummary[]> => {
    if (shouldUseTestFixtures()) {
      const category = testCategories.find((item) => item.id === categoryId)
      return testWebsites.filter((website) => !category || website.categories.includes(category.name)).slice(0, 6)
    }

    const client = clientOrThrow()
    const { data: recommendations, error: recommendationError } = await client.rpc('recommend_website_ids', {
      p_category_id: categoryId ?? undefined,
      p_limit: 6,
    })
    if (recommendationError) throw recommendationError
    const ids = (recommendations ?? []).map((item) => item.website_id)
    if (ids.length === 0) return []
    const { data, error } = await client.from('websites').select(websiteColumns).in('id', ids)
    if (error) throw error
    const byId = new Map((data ?? []).map((row) => [row.id, row]))
    return summariesFor(ids.flatMap((id) => byId.get(id) ? [byId.get(id)!] : []))
  },

  listDiscoveryPool: async (): Promise<WebsiteSummary[]> => {
    if (shouldUseTestFixtures()) return testWebsites

    const client = clientOrThrow()
    const rows: PublicWebsiteRow[] = []
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await client
        .from('websites')
        .select(websiteColumns)
        .order('approved_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + 99)
      if (error) throw error
      rows.push(...(data ?? []))
      if (!data || data.length < 100) break
    }

    return summariesFor(rows)
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
      slug: row.slug,
      name: row.display_name,
      description: row.description,
      accent: accents[row.slug] ?? '#ff9800',
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

    return (await summariesFor([data]))[0]
  },
}

export const discoveryAdapter = {
  bump: async (
    interestId: string,
    seenIds: string[],
    requestId: string,
  ) => {
    if (shouldUseTestFixtures()) {
      const [websites, categories] = await Promise.all([
        catalogueAdapter.listDiscoveryPool(), catalogueAdapter.listCategories(),
      ])
      return selectNextDiscovery(websites, categories, interestId, seenIds)
    }
    const client = clientOrThrow()
    const { data, error } = await client.functions.invoke('bump-website', {
      body: {
        category_id: interestId === 'all' ? null : interestId,
        recent_ids: seenIds.slice(-20),
        request_id: requestId,
      },
    })
    if (error) {
      const body = 'context' in error && error.context instanceof Response
        ? await error.context.clone().json().catch(() => null) as { code?: string } | null
        : null
      if (body?.code === 'EMPTY_CATALOGUE') return null
      if (body?.code === 'RATE_LIMITED') throw new Error('RATE_LIMITED')
      throw error
    }
    const selection = bumpResponseSchema.parse(data)
    const website = await catalogueAdapter.getById(selection.website.id)
    if (!website) throw new Error('The selected website is no longer available.')
    return { website, resetCycle: false, exclusionsRelaxed: selection.exclusions_relaxed }
  },
}

export type { Category, WebsiteSummary }
