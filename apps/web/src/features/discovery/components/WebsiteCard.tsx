import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '../../../app/paths'
import type { WebsiteSummary } from '../../../lib/types'

interface WebsiteCardProps {
  website: WebsiteSummary
}

export function WebsiteCard({ website }: WebsiteCardProps) {
  return (
    <article className="website-card">
      <div
        aria-hidden="true"
        className="website-card__art"
        style={{ background: website.image }}
      >
        <span>{website.displayDomain.slice(0, 1).toUpperCase()}</span>
      </div>
      <div className="website-card__body">
        <div className="website-card__meta">
          <span>{website.addedLabel}</span>
          <span>{website.categories.join(' · ')}</span>
        </div>
        <h3>{website.title}</h3>
        <p>{website.description}</p>
        <Link
          aria-label={`Discover ${website.title}`}
          className="card-link"
          to={paths.viewer(website.id)}
        >
          Take a look <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}
