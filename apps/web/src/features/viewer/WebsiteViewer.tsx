import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Home } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAppState } from '../../app/AppState'
import { paths } from '../../app/paths'
import { LoadingWheel } from '../../components/LoadingWheel'
import { catalogueAdapter } from '../../lib/adapters'
import { interactionAdapter } from '../../lib/adapters/interactions'
import { useAuth } from '../auth/AuthProvider'

type VisitSource = 'card' | 'bookmark' | 'history'
function visitFromState(state: unknown): { source: VisitSource; requestId: string } | null {
  if (!state || typeof state !== 'object') return null
  const value = state as Record<string, unknown>
  if (value.historySource !== 'card' && value.historySource !== 'bookmark' && value.historySource !== 'history') return null
  if (typeof value.historyRequestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.historyRequestId)) return null
  return { source: value.historySource, requestId: value.historyRequestId }
}

export default function WebsiteViewer() {
  const { websiteId = '' } = useParams()
  const location = useLocation()
  const visit = visitFromState(location.state)
  const visitSource = visit?.source
  const visitRequestId = visit?.requestId
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { dispatch } = useAppState()
  const [hintForId, setHintForId] = useState<string | null>(null)
  const [helpForId, setHelpForId] = useState<string | null>(null)
  const [frameLoadedForId, setFrameLoadedForId] = useState<string | null>(null)
  const [visitErrorForId, setVisitErrorForId] = useState<string | null>(null)
  const website = useQuery({
    queryKey: ['catalogue', websiteId],
    queryFn: () => catalogueAdapter.getById(websiteId),
  })

  useEffect(() => {
    if (website.data) {
      dispatch({ type: 'website-visited', websiteId: website.data.id })
    }
  }, [dispatch, website.data])

  useEffect(() => {
    if (!user || !website.data || !visitSource || !visitRequestId) return
    let active = true
    const userId = user.id
    const id = website.data.id
    void interactionAdapter.recordVisit(id, visitSource, visitRequestId)
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: ['history', userId] })
        await queryClient.invalidateQueries({ queryKey: ['recommendations', userId] })
        if (active) setVisitErrorForId(null)
      })
      .catch(() => { if (active) setVisitErrorForId(id) })
    return () => { active = false }
  }, [user, website.data, visitSource, visitRequestId, queryClient])

  useEffect(() => {
    const show = window.setTimeout(() => setHintForId(websiteId), 9000)
    return () => window.clearTimeout(show)
  }, [websiteId])

  if (website.isPending) {
    return <LoadingWheel />
  }

  if (website.isError || !website.data) {
    return (
      <main className="route-state" role="alert">
        <p className="eyebrow">Lost link</p>
        <h1>That discovery isn't available.</h1>
        <p>It may have moved, been paused or never belonged to the catalogue.</p>
        <Link className="primary-link" to={paths.home}>
          <Home aria-hidden="true" /> Return home
        </Link>
      </main>
    )
  }

  if (new URL(website.data.originalUrl).origin === window.location.origin) {
    return (
      <main className="route-state" role="alert">
        <h1>That discovery isn't available.</h1>
        <Link className="primary-link" to={paths.home}>Return home</Link>
      </main>
    )
  }

  return (
    <main className="viewer-shell">
      <div className="viewer-meta">
        <div>
          <strong>{website.data.title}</strong>
          <span>{website.data.displayDomain}</span>
        </div>
        {frameLoadedForId !== websiteId && <p role="status">Opening website…</p>}
        {hintForId === websiteId && (
          <button className="viewer-help-toggle" onClick={() => setHelpForId(helpForId === websiteId ? null : websiteId)} type="button">
            Trouble viewing?
          </button>
        )}
        {user && visitErrorForId === websiteId && <p role="alert">This visit could not be saved to your history.</p>}
      </div>
      {helpForId === websiteId && (
        <p className="viewer-help" role="status">Choose Broken website from the thumbs-down menu, or spin the Wheel again.</p>
      )}
      <iframe
        aria-label={`${website.data.title} website`}
        onLoad={() => setFrameLoadedForId(websiteId)}
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-forms allow-scripts allow-same-origin"
        src={website.data.originalUrl}
      />
    </main>
  )
}
