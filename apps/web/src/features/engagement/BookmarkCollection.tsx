import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../../app/paths'
import { interactionAdapter } from '../../lib/adapters/interactions'
import { getSupabaseClient } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

const pageSize = 20
type Cursor = { created_at: string; website_id: string } | null

export function BookmarkCollection() {
  const { user } = useAuth()
  const client = getSupabaseClient()
  const queryClient = useQueryClient()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bookmarks = useInfiniteQuery({
    queryKey: ['bookmarks', user?.id],
    enabled: Boolean(user && client),
    initialPageParam: null as Cursor,
    queryFn: async ({ pageParam }) => {
      if (!user || !client) return []
      let query = client
        .from('bookmarks')
        .select('website_id, created_at, websites(id, title, description)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .order('website_id', { ascending: false })
        .limit(pageSize)
      if (pageParam) {
        query = query.or(`created_at.lt.${pageParam.created_at},and(created_at.eq.${pageParam.created_at},website_id.lt.${pageParam.website_id})`)
      }
      const { data, error: readError } = await query
      if (readError) throw readError
      return data
    },
    getNextPageParam: (lastPage) => lastPage.length === pageSize
      ? { created_at: lastPage[lastPage.length - 1].created_at, website_id: lastPage[lastPage.length - 1].website_id }
      : undefined,
  })
  const entries = bookmarks.data?.pages.flat() ?? []

  async function remove(websiteId: string) {
    if (!user) return
    setRemovingId(websiteId)
    setError(null)
    try {
      await interactionAdapter.removeBookmark(websiteId)
      await queryClient.resetQueries({ queryKey: ['bookmarks', user.id] })
      await queryClient.invalidateQueries({ queryKey: ['interaction', user.id, websiteId] })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The bookmark could not be removed.') }
    finally { setRemovingId(null) }
  }

  return (
    <main className="settings-page" id="main-content">
      <div className="settings-heading">
        <Link className="text-link" to={paths.home}>← Back to discovery</Link>
        <h1>Bookmarks</h1>
        <p>Websites you saved from Flukewheel.</p>
      </div>
      {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
      {bookmarks.isPending && <p>Loading bookmarks…</p>}
      {bookmarks.isError && <p role="alert">Bookmarks could not be loaded. <button className="text-button" onClick={() => void bookmarks.refetch()} type="button">Try again</button></p>}
      {bookmarks.isSuccess && entries.length === 0 && <p>No bookmarks yet. Open a discovery and use the bookmark icon to save it here.</p>}
      {entries.length > 0 && (
        <ol className="bookmark-list">
          {entries.map((entry) => (
            <li className="bookmark-item" key={entry.website_id}>
              <div>
                <h2>{entry.websites?.title ?? 'Unavailable website'}</h2>
                <p>{entry.websites?.description ?? 'This discovery is no longer available in the catalogue.'}</p>
                {entry.websites && <Link className="text-link" state={{ historySource: 'bookmark', historyRequestId: crypto.randomUUID() }} to={paths.viewer(entry.website_id)}>Open in viewer</Link>}
              </div>
              <button className="secondary-button" disabled={removingId === entry.website_id} onClick={() => void remove(entry.website_id)} type="button">Remove bookmark</button>
            </li>
          ))}
        </ol>
      )}
      {bookmarks.hasNextPage && <button className="secondary-button" disabled={bookmarks.isFetchingNextPage} onClick={() => void bookmarks.fetchNextPage()} type="button">{bookmarks.isFetchingNextPage ? 'Loading…' : 'Show more bookmarks'}</button>}
    </main>
  )
}
