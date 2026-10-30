import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronLeft, ChevronRight, Compass, LogIn } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppState } from '../../app/AppState'
import { paths } from '../../app/paths'
import { EmptyState } from '../../components/RouteState'
import { catalogueAdapter } from '../../lib/adapters'
import { WebsiteCard } from './components/WebsiteCard'
import { useAuth } from '../auth/AuthProvider'
import { authAdapter } from '../../lib/adapters/auth'
import { getSupabaseClient } from '../../lib/supabase'

interface DiscoveryFeedProps {
  onOpenAuth: () => void
}

function moveCarousel(carousel: HTMLDivElement, direction: -1 | 1) {
  const card = carousel.querySelector<HTMLElement>('.website-card')
  if (!card) return
  const maxScroll = carousel.scrollWidth - carousel.clientWidth
  if (maxScroll <= 0) return
  const gap = Number.parseFloat(window.getComputedStyle(carousel).columnGap) || 0
  const step = card.getBoundingClientRect().width + gap

  if (direction === 1 && carousel.scrollLeft >= maxScroll - 2) {
    carousel.scrollTo({ left: 0, behavior: 'auto' })
  } else if (direction === -1 && carousel.scrollLeft <= 2) {
    carousel.scrollTo({ left: maxScroll, behavior: 'auto' })
  } else {
    carousel.scrollBy({ left: direction * step, behavior: 'smooth' })
  }
}

export function DiscoveryFeed({ onOpenAuth }: DiscoveryFeedProps) {
  const { user, profile } = useAuth()
  const [googleError, setGoogleError] = useState<string | null>(null)
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const { dispatch } = useAppState()
  const recentRef = useRef<HTMLDivElement>(null)
  const [carouselPaused, setCarouselPaused] = useState(false)
  const catalogue = useQuery({
    queryKey: ['catalogue', 'recent'],
    queryFn: catalogueAdapter.listRecent,
  })
  const categoryQuery = useQuery({
    queryKey: ['categories'],
    queryFn: catalogueAdapter.listCategories,
  })
  const interestQuery = useQuery({
    queryKey: ['user-interests', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const client = getSupabaseClient()
      if (!client || !user) return []
      const { data, error } = await client.from('user_interests').select('category_id').eq('user_id', user.id)
      if (error) throw error
      return data.map((row) => row.category_id)
    },
  })
  const selectedNames = new Set(categoryQuery.data?.filter((category) => interestQuery.data?.includes(category.id)).map((category) => category.name) ?? [])
  const suggestedWebsites = catalogue.data?.filter((website) => selectedNames.size === 0 || website.categories.some((name) => selectedNames.has(name))).slice(0, 3) ?? []

  const activeCategory = categoryQuery.data?.find(
    (category) => category.id === categoryId,
  )
  const visibleWebsites = activeCategory
    ? catalogue.data?.filter((website) =>
        website.categories.includes(activeCategory.name),
      )
    : catalogue.data
  const recentWebsites = visibleWebsites?.slice(0, 10)
  const recentCount = recentWebsites?.length ?? 0

  useEffect(() => {
    if (recentCount < 2 || carouselPaused || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => {
      if (!document.hidden && recentRef.current) moveCarousel(recentRef.current, 1)
    }, 2800)
    return () => window.clearInterval(timer)
  }, [carouselPaused, recentCount])

  function scrollRecent(direction: -1 | 1) {
    const carousel = recentRef.current
    if (!carousel) return
    moveCarousel(carousel, direction)
  }

  return (
    <main id="main-content">
      {!categoryId && (
        <section aria-labelledby="welcome-heading" className="welcome-section">
          <div className="welcome-section__copy">
            <h1 id="welcome-heading">internet as an art.</h1>
            <p>
              like reels but for interesting corners of the web. bringing back the wild west of the internet experience with serendipity, tailored to you. Hand picked by humans.
            </p>
            <p>
              It never got smaller or less interesting, you just became held down by the commerce of things.
            </p>
          </div>
          <img
            alt="Animated retro internet collage with skaters over a globe"
            className="welcome-section__image"
            decoding="async"
            height="469"
            src={`${import.meta.env.BASE_URL}homepage.gif`}
            width="500"
          />
        </section>
      )}
      <section
        aria-labelledby="recent-heading"
        className={`feed-section${categoryId ? ' feed-section--first' : ''}`}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setCarouselPaused(false)
        }}
        onFocusCapture={() => setCarouselPaused(true)}
        onMouseEnter={() => setCarouselPaused(true)}
        onMouseLeave={() => setCarouselPaused(false)}
      >
        <div className="section-heading">
          <div>
            <h2 id="recent-heading">
              {activeCategory ? activeCategory.name : 'Recently added'}
            </h2>
          </div>
          <div className="section-heading__actions">
          {activeCategory && (
            <Link className="text-link" to={paths.home}>
              Clear category
            </Link>
          )}
          <button aria-label="Previous recent websites" className="carousel-button" data-tooltip="Previous recent websites" onClick={() => scrollRecent(-1)} title="Previous recent websites" type="button"><ChevronLeft aria-hidden="true" /></button>
          <button aria-label="Next recent websites" className="carousel-button" data-tooltip="Next recent websites" onClick={() => scrollRecent(1)} title="Next recent websites" type="button"><ChevronRight aria-hidden="true" /></button>
          </div>
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
          <div aria-label="Recently added websites" className="card-carousel" ref={recentRef}>
            {recentWebsites?.map((website) => (
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
            <h2 id="for-you-heading">For you</h2>
          </div>
        </div>
        {user ? (
          <>
            <p className="feed-section__intro">{selectedNames.size ? 'Based on your interests, with room for surprises.' : 'A few places to start. Add interests in your profile to make these more yours.'}</p>
            {!profile?.username && <p className="feed-section__intro"><Link className="text-link" to={paths.settings}>Choose a username</Link> to finish setting up your profile.</p>}
            {interestQuery.isError && <p role="alert">Your interests could not be loaded.</p>}
            <div className="card-grid">
              {suggestedWebsites.map((website) => <WebsiteCard key={website.id} website={website} />)}
            </div>
          </>
        ) : <div className="auth-invitation">
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
            <button className="secondary-button" onClick={() => { void authAdapter.signInWithGoogle().catch((cause) => setGoogleError(cause instanceof Error ? cause.message : 'Google sign-in could not start.')) }} type="button">
              Continue with Google
            </button>
            {googleError && <p role="alert">{googleError}</p>}
          </div>
        </div>}
      </section>

      <section aria-labelledby="categories-heading" className="feed-section">
        <div className="section-heading">
          <div>
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
