import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ExternalLink, Home } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppState } from '../../app/AppState'
import { paths } from '../../app/paths'
import { catalogueAdapter } from '../../lib/adapters'

export default function WebsiteViewer() {
  const { websiteId = '' } = useParams()
  const { dispatch } = useAppState()
  const website = useQuery({
    queryKey: ['catalogue', websiteId],
    queryFn: () => catalogueAdapter.getById(websiteId),
  })

  useEffect(() => {
    if (website.data) {
      dispatch({ type: 'website-visited', websiteId: website.data.id })
    }
  }, [dispatch, website.data])

  if (website.isPending) {
    return (
      <main className="route-state" aria-live="polite">
        <p className="eyebrow">Opening a discovery</p>
        <h1>Dusting off a curious corner...</h1>
      </main>
    )
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

  if (website.data.deliveryMode === 'external') {
    return (
      <main className="viewer-fallback">
        <div className="viewer-fallback__art" style={{ background: website.data.image }}>
          <span>{website.data.title.slice(0, 1)}</span>
        </div>
        <div>
          <p className="eyebrow">Open in a new tab</p>
          <h1>{website.data.title}</h1>
          <p>{website.data.description}</p>
          <p className="viewer-note">
            <AlertTriangle aria-hidden="true" /> This site is not marked as safe
            for inline viewing, so flukewheel won't try to force it into a frame.
          </p>
          <a
            className="primary-link"
            href={website.data.originalUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open original website <ExternalLink aria-hidden="true" />
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="viewer-shell">
      <iframe
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-forms allow-scripts"
        src={website.data.originalUrl}
        title={`${website.data.title} website`}
      />
    </main>
  )
}
