import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { paths } from '../../../app/paths'
import type { WebsiteSummary } from '../../../lib/types'

interface WebsiteCardProps {
  website: WebsiteSummary
  imageOverlay?: boolean
}

export function WebsiteCard({ website, imageOverlay = false }: WebsiteCardProps) {
  const navigate = useNavigate()
  const [imageFailed, setImageFailed] = useState(false)
  const hasThumbnail = Boolean(website.thumbnailUrl) && !imageFailed
  function openWebsite() {
    navigate(paths.viewer(website.id), { state: { historySource: 'card', historyRequestId: crypto.randomUUID() } })
  }
  return (
    <article className={`website-card${imageOverlay ? ' website-card--image-overlay' : ''}`}>
      <div
        aria-hidden="true"
        className="website-card__art"
        style={{ background: hasThumbnail ? website.image : '#292621' }}
      >
        {hasThumbnail ? (
          <img
            alt=""
            decoding="async"
            height="360"
            loading="lazy"
            onError={() => setImageFailed(true)}
            src={website.thumbnailUrl ?? undefined}
            width="640"
          />
        ) : (
          <span>{website.displayDomain.slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <div className="website-card__body">
        {!imageOverlay && <div className="website-card__meta">
          <span>{website.addedLabel}</span>
          <span>{website.categories.join(' · ')}</span>
        </div>}
        <h3>{imageOverlay ? <span>{website.title}</span> : website.title}</h3>
        <p>{imageOverlay ? <span>{website.description}</span> : website.description}</p>
        {imageOverlay ? <button
          aria-label={`Take a look at ${website.title}`}
          className="card-link"
          onClick={openWebsite}
          type="button"
        >
          Take a look <ArrowUpRight aria-hidden="true" />
        </button> : <Link
          aria-label={`Discover ${website.title}`}
          className="card-link"
          state={{ historySource: 'card', historyRequestId: crypto.randomUUID() }}
          to={paths.viewer(website.id)}
        >
          Take a look <ArrowUpRight aria-hidden="true" />
        </Link>}
      </div>
    </article>
  )
}
