import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Home } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppState } from '../../app/AppState'
import { paths } from '../../app/paths'
import { LoadingWheel } from '../../components/LoadingWheel'
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

  if (website.data.embeddingStatus === 'blocked') {
    return (
      <main className="route-state viewer-fallback">
        <p className="eyebrow">A discovery to open</p>
        <h1>{website.data.title}</h1>
        <p>{website.data.description} This site opens in its own tab.</p>
        <a className="primary-link" href={website.data.originalUrl} rel="noopener noreferrer" target="_blank">
          Open original website <ArrowUpRight aria-hidden="true" />
        </a>
      </main>
    )
  }

  return (
    <main className="viewer-shell">
      <iframe
        aria-label={`${website.data.title} website`}
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-forms allow-scripts allow-same-origin"
        src={website.data.originalUrl}
      />
    </main>
  )
}
