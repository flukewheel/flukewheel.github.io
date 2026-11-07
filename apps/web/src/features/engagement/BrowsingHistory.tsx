import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../../app/paths'
import { getSupabaseClient } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

const pageSize = 20
type Cursor = { discovered_at: string; id: string } | null
const sourceLabels: Record<string, string> = {
  bump: 'Wheel discovery', card: 'Catalogue card', bookmark: 'Bookmark', history: 'History revisit',
}

export function BrowsingHistory() {
  const { user } = useAuth()
  const client = getSupabaseClient()
  const queryClient = useQueryClient()
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const history = useInfiniteQuery({
    queryKey: ['history', user?.id],
    enabled: Boolean(user && client),
    initialPageParam: null as Cursor,
    queryFn: async ({ pageParam }) => {
      if (!user || !client) return []
      let query = client.from('bump_history')
        .select('id, website_id, discovered_at, source, websites(id, title, description)')
        .eq('user_id', user.id)
        .order('discovered_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(pageSize)
      if (pageParam) {
        query = query.or(`discovered_at.lt.${pageParam.discovered_at},and(discovered_at.eq.${pageParam.discovered_at},id.lt.${pageParam.id})`)
      }
      const { data, error: readError } = await query
      if (readError) throw readError
      return data
    },
    getNextPageParam: (lastPage) => lastPage.length === pageSize
      ? { discovered_at: lastPage[lastPage.length - 1].discovered_at, id: lastPage[lastPage.length - 1].id }
      : undefined,
  })
  const entries = history.data?.pages.flat() ?? []

  async function clearHistory() {
    if (!user || !client || !window.confirm('Clear your Flukewheel discovery history? This cannot be undone.')) return
    setClearing(true)
    setError(null)
    try {
      const { error: deleteError } = await client.from('bump_history').delete().eq('user_id', user.id)
      if (deleteError) throw deleteError
      await queryClient.resetQueries({ queryKey: ['history', user.id] })
      await queryClient.invalidateQueries({ queryKey: ['recommendations', user.id] })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'History could not be cleared.')
    } finally { setClearing(false) }
  }

  return (
    <main className="settings-page" id="main-content">
      <div className="settings-heading">
        <Link className="text-link" to={paths.home}>← Back to discovery</Link>
        <h1>Browsing history</h1>
        <p>Websites you discovered or revisited while signed in.</p>
      </div>
      {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
      {history.isPending && <p>Loading history…</p>}
      {history.isError && <p role="alert">History could not be loaded. <button className="text-button" onClick={() => void history.refetch()} type="button">Try again</button></p>}
      {history.isSuccess && entries.length === 0 && <p>No discoveries in your history yet.</p>}
      {entries.length > 0 && (
        <>
          <button className="secondary-button" disabled={clearing} onClick={() => void clearHistory()} type="button">{clearing ? 'Clearing…' : 'Clear history'}</button>
          <ol className="bookmark-list">
            {entries.map((entry) => (
              <li className="bookmark-item" key={entry.id}>
                <div>
                  <h2>{entry.websites?.title ?? 'Unavailable website'}</h2>
                  <p>{entry.websites?.description ?? 'This discovery is no longer available in the catalogue.'}</p>
                  <p>{sourceLabels[entry.source] ?? 'Discovery'}</p>
                  <p><time dateTime={entry.discovered_at}>{new Date(entry.discovered_at).toLocaleString()}</time></p>
                  {entry.websites && <Link className="text-link" state={{ historySource: 'history', historyRequestId: crypto.randomUUID() }} to={paths.viewer(entry.website_id)}>Open in viewer</Link>}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
      {history.hasNextPage && <button className="secondary-button" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()} type="button">{history.isFetchingNextPage ? 'Loading…' : 'Show more history'}</button>}
    </main>
  )
}
