import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Compass, LogIn } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppState } from '../../app/AppState'
import { paths } from '../../app/paths'
import { EmptyState } from '../../components/RouteState'
import { catalogueAdapter } from '../../lib/adapters'
import { WebsiteCard } from './components/WebsiteCard'

interface DiscoveryFeedProps {
  onOpenAuth: () => void
}

export function DiscoveryFeed({ onOpenAuth }: DiscoveryFeedProps) {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const { dispatch } = useAppState()
  const catalogue = useQuery({
    queryKey: ['catalogue', 'recent'],
    queryFn: catalogueAdapter.listRecent,
  })
  const categoryQuery = useQuery({
    queryKey: ['categories'],
    queryFn: catalogueAdapter.listCategories,
  })

  const activeCategory = categoryQuery.data?.find(
    (category) => category.id === categoryId,
  )
  const visibleWebsites = activeCategory
    ? catalogue.data?.filter((website) =>
        website.categories.includes(activeCategory.name),
      )
    : catalogue.data

  return (
    <main id="main-content">
      <section aria-labelledby="recent-heading" className="feed-section feed-section--first">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Fresh finds</p>
            <h2 id="recent-heading">
              {activeCategory ? activeCategory.name : 'Recently added'}
            </h2>
          </div>
          {activeCategory && (
            <Link className="text-link" to={paths.home}>
              Clear category
            </Link>
          )}
        </div>

        {catalogue.isPending && (
          <div aria-label="Loading recent websites" className="card-grid">
            {[0, 1, 2].map((item) => (
              <div className="website-card website-card--loading" key={item} />
            ))}
          </div>
        )}
        {catalogue.isError && (
          <div className="inline-state" role="alert">
            <p>We couldn’t load the latest finds.</p>
            <button onClick={() => void catalogue.refetch()} type="button">
              Try again
            </button>
          </div>
        )}
        {categoryId && categoryQuery.isSuccess && !activeCategory && (
          <EmptyState>
            <p>This category is not in the catalogue.</p>
            <Link className="text-link" to={paths.home}>
              Show all discoveries
            </Link>
          </EmptyState>
        )}
        {categoryQuery.isError && (
          <div className="inline-state" role="alert">
            <p>We couldn’t load that category.</p>
            <button onClick={() => void categoryQuery.refetch()} type="button">
              Try again
            </button>
          </div>
        )}
        {visibleWebsites && visibleWebsites.length > 0 && (
          <div className="card-grid">
            {visibleWebsites.slice(0, 3).map((website) => (
              <WebsiteCard key={website.id} website={website} />
            ))}
          </div>
        )}
        {catalogue.isSuccess && categoryQuery.isSuccess && activeCategory && visibleWebsites?.length === 0 && (
          <EmptyState>
            <p>No websites match this interest yet.</p>
            <Link className="text-link" to={paths.home}>
              Explore every interest
            </Link>
          </EmptyState>
        )}
      </section>

      <section aria-labelledby="for-you-heading" className="feed-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your curious side</p>
            <h2 id="for-you-heading">For you</h2>
          </div>
        </div>
        <div className="auth-invitation">
          <div className="auth-invitation__icon" aria-hidden="true">
            <Compass />
          </div>
          <div>
            <h3>Make every Bump! a little more yours.</h3>
            <p>
              Choose interests, remember great finds and shape your future
              discoveries while keeping the surprises.
            </p>
          </div>
          <div className="auth-invitation__actions">
            <button className="primary-button" onClick={onOpenAuth} type="button">
              <LogIn aria-hidden="true" /> Log in / Sign up
            </button>
            <button className="secondary-button" onClick={onOpenAuth} type="button">
              Continue with Google
            </button>
          </div>
        </div>
      </section>

      <section aria-labelledby="categories-heading" className="feed-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pick a direction</p>
            <h2 id="categories-heading">Explore categories</h2>
          </div>
        </div>
        {categoryQuery.isPending && (
          <div className="inline-state" aria-live="polite">
            <p>Loading categories…</p>
          </div>
        )}
        {categoryQuery.isError && (
          <div className="inline-state" role="alert">
            <p>We couldn’t load the categories.</p>
            <button onClick={() => void categoryQuery.refetch()} type="button">
              Try again
            </button>
          </div>
        )}
        {categoryQuery.isSuccess && categoryQuery.data.length === 0 && (
          <EmptyState>
            <p>No categories are available yet.</p>
          </EmptyState>
        )}
        {categoryQuery.isSuccess && categoryQuery.data.length > 0 && <div className="category-grid">
          {categoryQuery.data?.map((category, index) => (
            <button
              className="category-card"
              key={category.id}
              onClick={() => {
                dispatch({
                  type: 'interest-selected',
                  interestId: category.id,
                })
                navigate(paths.category(category.id))
              }}
              style={{ '--category-accent': category.accent } as CSSProperties}
              type="button"
            >
              <span className="category-card__number">0{index + 1}</span>
              <span>
                <strong>{category.name}</strong>
                <small>{category.description}</small>
              </span>
              <ArrowRight aria-hidden="true" />
            </button>
          ))}
        </div>}
      </section>
    </main>
  )
}
