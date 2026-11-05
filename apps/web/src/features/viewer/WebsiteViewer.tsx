import { useQuery } from '@tanstack/react-query'
import { Home } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppState } from '../../app/AppState'
import { paths } from '../../app/paths'
import { LoadingWheel } from '../../components/LoadingWheel'
import { catalogueAdapter } from '../../lib/adapters'

export default function WebsiteViewer() {
  const { websiteId = '' } = useParams()
  const { dispatch } = useAppState()
  const [hintForId, setHintForId] = useState<string | null>(null)
  const [helpForId, setHelpForId] = useState<string | null>(null)
  const [frameLoadedForId, setFrameLoadedForId] = useState<string | null>(null)
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
      </div>
      {helpForId === websiteId && (
        <p className="viewer-help" role="status">Choose Broken website from the thumbs-down menu, or try Bump! again.</p>
      )}
      <iframe
        onLoad={() => setFrameLoadedForId(websiteId)}
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-forms allow-scripts allow-same-origin"
        src={website.data.originalUrl}
        title={`${website.data.title} website`}
      />
    </main>
  )
}
