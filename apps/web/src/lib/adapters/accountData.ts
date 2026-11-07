import { getSupabaseClient } from '../supabase'

const pageSize = 500
const maxRowsPerCollection = 10_000

export async function exportAccountData() {
  const client = getSupabaseClient()
  if (!client) throw new Error('Account data is unavailable.')
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError || !user || user.is_anonymous) throw new Error('Log in to export your data.')

  async function allRows<T>(readPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
    const rows: T[] = []
    for (let from = 0; from <= maxRowsPerCollection; from += pageSize) {
      const { data, error } = await readPage(from, from + pageSize - 1)
      if (error) throw new Error(error.message)
      rows.push(...(data ?? []))
      if ((data?.length ?? 0) < pageSize) return rows
    }
    throw new Error('Your account has too many records for a complete browser export. Please contact the site owner.')
  }

  const [profile, interests, reactions, bookmarks, history, submissions] = await Promise.all([
    client.from('profiles').select('id,username,created_at,updated_at').eq('id', user.id).maybeSingle(),
    allRows(async (from, to) => await client.from('user_interests').select('category_id,created_at').eq('user_id', user.id).order('category_id').range(from, to)),
    allRows(async (from, to) => await client.from('website_reactions').select('website_id,reaction,reason,created_at,updated_at').eq('user_id', user.id).order('website_id').range(from, to)),
    allRows(async (from, to) => await client.from('bookmarks').select('website_id,created_at').eq('user_id', user.id).order('website_id').range(from, to)),
    allRows(async (from, to) => await client.from('bump_history').select('id,website_id,discovered_at,source,request_id').eq('user_id', user.id).order('id').range(from, to)),
    allRows(async (from, to) => await client.from('website_submissions').select('id,raw_url,description,suggested_categories,status,submitted_at,reviewed_at,resolved_website_id').eq('submitter_id', user.id).order('id').range(from, to)),
  ])
  if (profile.error) throw profile.error
  return {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile: profile.data,
    interests, reactions, bookmarks, history, submissions,
  }
}
