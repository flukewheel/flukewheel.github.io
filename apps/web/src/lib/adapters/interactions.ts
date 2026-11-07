import { getSupabaseClient } from '../supabase'

async function authenticated() {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase is not configured.')
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user || user.is_anonymous) throw new Error('Log in to save this website.')
  return { client, userId: user.id }
}

export const interactionAdapter = {
  async recordVisit(websiteId: string, source: 'card' | 'bookmark' | 'history', requestId: string) {
    const { client, userId } = await authenticated()
    const { error } = await client.from('bump_history').upsert({
      user_id: userId, website_id: websiteId, source, request_id: requestId,
    }, { onConflict: 'user_id,request_id', ignoreDuplicates: true })
    if (error) throw error
  },
  async getState(websiteId: string) {
    const { client, userId } = await authenticated()
    const [reaction, bookmark] = await Promise.all([
      client.from('website_reactions').select('reaction,reason').eq('user_id', userId).eq('website_id', websiteId).maybeSingle(),
      client.from('bookmarks').select('website_id').eq('user_id', userId).eq('website_id', websiteId).maybeSingle(),
    ])
    if (reaction.error) throw reaction.error
    if (bookmark.error) throw bookmark.error
    return { reaction: reaction.data?.reaction ?? null, reason: reaction.data?.reason ?? null, bookmarked: Boolean(bookmark.data) }
  },
  async setReaction(websiteId: string, reaction: 'love' | 'dislike', reason: string | null = null) {
    const { client, userId } = await authenticated()
    const { data: current, error: readError } = await client.from('website_reactions').select('website_id').eq('user_id', userId).eq('website_id', websiteId).maybeSingle()
    if (readError) throw readError
    const values = { reaction, reason: reaction === 'dislike' ? reason : null }
    const { error } = current
      ? await client.from('website_reactions').update(values).eq('user_id', userId).eq('website_id', websiteId)
      : await client.from('website_reactions').insert({ user_id: userId, website_id: websiteId, ...values })
    if (error?.code === '23505' && !current) {
      const retry = await client.from('website_reactions').update(values).eq('user_id', userId).eq('website_id', websiteId)
      if (retry.error) throw retry.error
      return
    }
    if (error) throw error
  },
  async removeReaction(websiteId: string) {
    const { client, userId } = await authenticated()
    const { error } = await client.from('website_reactions').delete().eq('user_id', userId).eq('website_id', websiteId)
    if (error) throw error
  },
  async saveBookmark(websiteId: string) {
    const { client, userId } = await authenticated()
    const { error } = await client.from('bookmarks').upsert({ user_id: userId, website_id: websiteId }, { onConflict: 'user_id,website_id', ignoreDuplicates: true })
    if (error) throw error
  },
  async removeBookmark(websiteId: string) {
    const { client, userId } = await authenticated()
    const { error } = await client.from('bookmarks').delete().eq('user_id', userId).eq('website_id', websiteId)
    if (error) throw error
  },
}
