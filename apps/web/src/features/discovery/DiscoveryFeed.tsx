import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronLeft, ChevronRight, Compass, LogIn } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useAppState } from '../../app/AppState'
import { paths } from '../../app/paths'
import { EmptyState } from '../../components/RouteState'
import { GoogleSignInButton } from '../../components/GoogleSignInButton'
import { catalogueAdapter } from '../../lib/adapters'
import { authAdapter } from '../../lib/adapters/auth'
import { getSupabaseClient } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { WebsiteCard } from './components/WebsiteCard'
import { WheelButton } from './components/WheelButton'

interface DiscoveryFeedProps {
  onOpenAuth: () => void
  onSpin: () => void
  spinBusy: boolean
}

const homeScrollKey = 'flukewheel:home-scroll'
const recentScrollKey = 'flukewheel:recent-scroll'

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

function CardSkeleton({ count = 3 }: { count?: number }) {
  return <div aria-label="Loading website cards" className="card-grid">{Array.from({ length: count }, (_, index) => <div className="website-card website-card--loading" key={index} />)}</div>
}

export function DiscoveryFeed({ onOpenAuth, onSpin, spinBusy }: DiscoveryFeedProps) {
  const { user, profile, loading: authLoading } = useAuth()
  const [googleError, setGoogleError] = useState<string | null>(null)
  const { state, dispatch } = useAppState()
  const recentRef = useRef<HTMLDivElement>(null)
  const restoredRef = useRef(false)
  const initialHomeScroll = useMemo(() => Number(sessionStorage.getItem(homeScrollKey) ?? 0), [])
  const initialRecentScroll = useMemo(() => Number(sessionStorage.getItem(recentScrollKey) ?? 0), [])
  const [carouselPaused, setCarouselPaused] = useState(false)
  const catalogue = useQuery({ queryKey: ['catalogue', 'recent'], queryFn: catalogueAdapter.listRecent })
  const categoryQuery = useQuery({ queryKey: ['categories'], queryFn: catalogueAdapter.listCategories })
  const selectedCategory = categoryQuery.data?.find((category) => category.id === state.selectedInterest)
  const recommendationCategoryId = selectedCategory?.id ?? null
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
  const recommendations = useQuery({
    queryKey: ['recommendations', user?.id, recommendationCategoryId ?? 'all'],
    enabled: Boolean(user && !authLoading && categoryQuery.isSuccess),
    queryFn: () => catalogueAdapter.listRecommendations(recommendationCategoryId),
    retry: (failureCount, error) => !error.message.includes('RATE_LIMITED') && failureCount < 3,
  })
  const hasInterests = Boolean(interestQuery.data?.length)
  const recentCount = catalogue.data?.length ?? 0

  useEffect(() => {
    if (categoryQuery.isSuccess && state.selectedInterest !== 'all' && !selectedCategory) {
      dispatch({ type: 'interest-selected', interestId: 'all' })
    }
  }, [categoryQuery.isSuccess, selectedCategory, state.selectedInterest, dispatch])

  useLayoutEffect(() => {
    restoredRef.current = false
    if (import.meta.env.MODE !== 'test') window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    if (recentCount < 2 || carouselPaused || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => {
      if (!document.hidden && recentRef.current) moveCarousel(recentRef.current, 1)
    }, 2800)
    return () => window.clearInterval(timer)
  }, [carouselPaused, recentCount])

  useLayoutEffect(() => {
    const save = () => { if (restoredRef.current) sessionStorage.setItem(homeScrollKey, String(window.scrollY)) }
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [])

  useEffect(() => {
    if (import.meta.env.MODE === 'test' || !catalogue.isSuccess || !categoryQuery.isSuccess) return
    const frame = requestAnimationFrame(() => {
      if (Number.isFinite(initialHomeScroll)) window.scrollTo({ top: initialHomeScroll, behavior: 'auto' })
      if (recentRef.current && Number.isFinite(initialRecentScroll)) recentRef.current.scrollLeft = initialRecentScroll
      restoredRef.current = true
    })
    return () => cancelAnimationFrame(frame)
  }, [catalogue.isSuccess, categoryQuery.isSuccess, initialHomeScroll, initialRecentScroll])

  function scrollRecent(direction: -1 | 1) {
    if (recentRef.current) moveCarousel(recentRef.current, direction)
  }

  return (
    <main id="main-content">
      <section aria-labelledby="welcome-heading" className="welcome-section">
        <div className="welcome-section__copy">
          <h1 id="welcome-heading">internet as an art.</h1>
          <p>like reels but for interesting corners of the web. bringing back the wild west of the internet experience with serendipity, tailored to you. Hand picked by humans.</p>
          <p>It never got smaller or less interesting, you just became held down by the commerce of things.</p>
        </div>
        <img alt="Animated retro internet collage with skaters over a globe" className="welcome-section__image" decoding="async" height="469" src={`${import.meta.env.BASE_URL}homepage.gif`} width="500" />
      </section>

      <section aria-labelledby="spin-heading" className="spin-section">
        <div className="spin-section__copy">
          <h2 id="spin-heading">Spin the Wheel!</h2>
          <p>Tap the wheel and be a frontiersman! Just do it you wuss!</p>
        </div>
        <ArrowRight aria-hidden="true" className="spin-section__arrow" />
        <WheelButton busy={spinBusy} label="Spin the Wheel" onWheel={onSpin} />
      </section>

      <section aria-labelledby="recent-heading" className="feed-section" onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setCarouselPaused(false) }} onFocusCapture={() => setCarouselPaused(true)} onMouseEnter={() => setCarouselPaused(true)} onMouseLeave={() => setCarouselPaused(false)}>
        <div className="section-heading">
          <h2 id="recent-heading">Recently added</h2>
          <div className="section-heading__actions">
            <Link className="text-link" to={paths.recent}>See all websites</Link>
            <button aria-label="Previous recent websites" className="carousel-button" onClick={() => scrollRecent(-1)} type="button"><ChevronLeft aria-hidden="true" /></button>
            <button aria-label="Next recent websites" className="carousel-button" onClick={() => scrollRecent(1)} type="button"><ChevronRight aria-hidden="true" /></button>
          </div>
        </div>
        {catalogue.isPending && <CardSkeleton />}
        {catalogue.isError && <div className="inline-state" role="alert"><p>We couldn’t load the latest finds.</p><button onClick={() => void catalogue.refetch()} type="button">Try again</button></div>}
        {catalogue.isSuccess && catalogue.data.length === 0 && <EmptyState><p>No websites have been added yet.</p></EmptyState>}
        {catalogue.isSuccess && catalogue.data.length > 0 && <div aria-label="Recently added websites" className="card-carousel" onScroll={(event) => { if (restoredRef.current) sessionStorage.setItem(recentScrollKey, String(event.currentTarget.scrollLeft)) }} ref={recentRef}>{catalogue.data.map((website) => <WebsiteCard imageOverlay key={website.id} website={website} />)}</div>}
      </section>

      <section aria-labelledby="for-you-heading" className="feed-section">
        <div className="section-heading"><h2 id="for-you-heading">For you</h2></div>
        {authLoading ? <CardSkeleton /> : user ? (
          <>
            {(selectedCategory || !hasInterests) && <p className="feed-section__intro">{selectedCategory ? `Discoveries in ${selectedCategory.name}, with room for surprises.` : 'A few places to start. Add interests in your profile to make these more yours.'}</p>}
            {!hasInterests && <p className="feed-section__intro"><Link className="text-link" to={paths.settings}>Choose interests</Link> to shape future discoveries.</p>}
            {!profile?.username && <p className="feed-section__intro"><Link className="text-link" to={paths.settings}>Choose a username</Link> to finish setting up your profile.</p>}
            {interestQuery.isError && <p role="alert">Your interests could not be loaded. <button className="text-button" onClick={() => void interestQuery.refetch()} type="button">Try again</button></p>}
            {categoryQuery.isError && <div className="inline-state" role="alert"><p>Your recommendations could not be loaded because the interests are unavailable.</p><button onClick={() => void categoryQuery.refetch()} type="button">Try again</button></div>}
            {(categoryQuery.isPending || categoryQuery.isSuccess && recommendations.isPending) && <CardSkeleton />}
            {recommendations.isError && <div className="inline-state" role="alert"><p>{recommendations.error.message.includes('RATE_LIMITED') ? 'Recommendations are busy right now. Please try again in a minute.' : 'Your recommendations could not be loaded.'}</p><button onClick={() => void recommendations.refetch()} type="button">Try again</button></div>}
            {recommendations.isSuccess && recommendations.data.length === 0 && <EmptyState><p>There are no recommendations available right now.</p><Link className="text-link" to={paths.recent}>Browse recent websites</Link></EmptyState>}
            {recommendations.isSuccess && recommendations.data.length > 0 && <div className="card-grid">{recommendations.data.map((website) => <WebsiteCard imageOverlay key={website.id} website={website} />)}</div>}
          </>
        ) : (
          <div className="auth-invitation">
            <div className="auth-invitation__icon" aria-hidden="true"><Compass /></div>
            <div><h3>Make every spin a little more yours.</h3><p>Choose interests, remember great finds and shape your future discoveries while keeping the surprises.</p></div>
            <div className="auth-invitation__actions">
              <button className="primary-button" onClick={onOpenAuth} type="button"><LogIn aria-hidden="true" /> Log in / Sign up</button>
              <GoogleSignInButton onClick={() => { void authAdapter.signInWithGoogle().catch((cause) => setGoogleError(cause instanceof Error ? cause.message : 'Google sign-in could not start.')) }} />
              {googleError && <p role="alert">{googleError}</p>}
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="categories-heading" className="feed-section">
        <div className="section-heading"><h2 id="categories-heading">Explore categories</h2></div>
        {categoryQuery.isPending && <div aria-live="polite" className="inline-state"><p>Loading categories…</p></div>}
        {categoryQuery.isError && <div className="inline-state" role="alert"><p>We couldn’t load the categories.</p><button onClick={() => void categoryQuery.refetch()} type="button">Try again</button></div>}
        {categoryQuery.isSuccess && categoryQuery.data.length === 0 && <EmptyState><p>No categories are available yet.</p></EmptyState>}
        {categoryQuery.isSuccess && categoryQuery.data.length > 0 && <div className="category-grid">{categoryQuery.data.map((category, index) => (
          <Link className="category-card" key={category.id} onClick={() => dispatch({ type: 'interest-selected', interestId: category.id })} style={{ '--category-accent': category.accent } as CSSProperties} to={paths.category(category.id)}>
            <span className="category-card__number">{String(index + 1).padStart(2, '0')}</span>
            <span><strong>{category.name}</strong><small>{category.description}</small></span>
            <ArrowRight aria-hidden="true" />
          </Link>
        ))}</div>}
      </section>
    </main>
  )
}
