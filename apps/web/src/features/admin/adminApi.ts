import { getSupabaseClient } from '../../lib/supabase'

export interface PendingSubmission {
  id: string
  raw_url: string
  normalised_url: string
  suggested_categories: string[]
  description: string | null
  submitted_at: string
  validation_status: string | null
  verification_notes: string | null
  duplicate_website_id: string | null
}

export interface ReviewInput {
  submission_id: string
  decision: 'approve' | 'reject'
  title: string | null
  description: string | null
  category_ids: string[]
}

export interface ManagedWebsite {
  id: string
  title: string
  description: string
  original_url: string
  thumbnail_path: string | null
  active: boolean
  embedding_status: 'unknown' | 'allowed' | 'blocked' | 'needs_review'
  last_validated_at: string | null
  category_ids: string[]
}

export interface ManagedCategory {
  id: string
  slug: string
  name: string
  description: string
  active: boolean
  display_order: number
}

export interface ReportSignal {
  website_id: string
  title: string
  original_url: string
  active: boolean
  broken: number
  inappropriate: number
  low_quality: number
  last_reported_at: string
}

export interface RecheckJob {
  website_id: string
  title: string
  original_url: string
  status: 'pending' | 'failed'
  attempts: number
  last_validated_at: string | null
  note: string | null
}

async function invoke<T>(body: object): Promise<T> {
  const client = getSupabaseClient()
  if (!client) throw new Error('Administration is unavailable.')
  const { data, error } = await client.functions.invoke('admin-catalogue', { body })
  if (error) {
    const response = 'context' in error ? error.context : null
    const details = response instanceof Response ? await response.json().catch(() => null) as { message?: string } | null : null
    const failure = new Error(details?.message ?? 'Administration could not be reached. Please try again.')
    Object.assign(failure, { status: response instanceof Response ? response.status : 0 })
    throw failure
  }
  return data as T
}

export const adminApi = {
  async isAdmin() {
    try { return (await invoke<{ administrator: boolean }>({ action: 'status' })).administrator }
    catch (cause) {
      if ((cause as { status?: number }).status === 403) return false
      throw cause
    }
  },
  async queue() {
    const result = await invoke<{ submissions: PendingSubmission[] }>({ action: 'queue' })
    return result.submissions
  },
  async catalogue(search: string) {
    const websites: ManagedWebsite[] = []
    let after: ManagedWebsite | undefined
    while (true) {
      const result = await invoke<{ websites: ManagedWebsite[] }>({
        action: 'catalogue', search,
        after_title: after?.title ?? null,
        after_id: after?.id ?? null,
      })
      websites.push(...result.websites)
      if (result.websites.length < 50) return websites
      if (result.websites.at(-1)?.id === after?.id) throw new Error('Catalogue pagination did not advance.')
      after = result.websites.at(-1)
    }
  },
  async categories() {
    const result = await invoke<{ categories: ManagedCategory[] }>({ action: 'categories' })
    return result.categories
  },
  async reports() {
    const result = await invoke<{ reports: ReportSignal[] }>({ action: 'reports' })
    return result.reports
  },
  async rechecks() {
    const result = await invoke<{ rechecks: RecheckJob[] }>({ action: 'rechecks' })
    return result.rechecks
  },
  async reviewReports(websiteId: string, note: string) {
    return invoke<{ website_id: string }>({ action: 'review_reports', website_id: websiteId, note })
  },
  async completeRecheck(input: { website_id: string; outcome: 'allowed' | 'blocked' | 'needs_review' | 'failed'; checked_url: string | null; note: string }) {
    return invoke<{ website_id: string }>({ action: 'complete_recheck', ...input })
  },
  async review(input: ReviewInput) {
    return invoke<{ status: string; website_id: string | null }>({ action: 'review', ...input })
  },
  async editWebsite(input: Omit<ManagedWebsite, 'id' | 'last_validated_at'> & { website_id: string; note: string }) {
    return invoke<{ website_id: string }>({ action: 'edit_website', ...input })
  },
  async deleteWebsite(websiteId: string, confirmTitle: string) {
    return invoke<{ website_id: string; bookmarks_deleted: number; history_deleted: number; reactions_deleted: number; submissions_deleted: number }>({
      action: 'delete_website', website_id: websiteId, confirm_title: confirmTitle,
    })
  },
  async saveCategory(input: Omit<ManagedCategory, 'id'> & { category_id: string | null }) {
    return invoke<{ category_id: string }>({ action: 'save_category', ...input })
  },
}
