import { useQuery } from '@tanstack/react-query'
import { House, Menu, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppState } from '../../../app/AppState'
import { paths } from '../../../app/paths'
import { IconButton } from '../../../components/IconButton'
import { MenuDismissLayer } from '../../../components/MenuDismissLayer'
import { catalogueAdapter, discoveryAdapter } from '../../../lib/adapters'
import { SubmissionModal } from '../../submissions/SubmissionModal'
import { WheelButton } from './WheelButton'
import { InterestSelector } from './InterestSelector'
import { ProfileMenu } from './ProfileMenu'
import { ReactionControls } from './ReactionControls'

interface NavigationBarProps {
  onOpenAuth: () => void
}

export function NavigationBar({ onOpenAuth }: NavigationBarProps) {
  const [submissionOpen, setSubmissionOpen] = useState(false)
  const [bumping, setBumping] = useState(false)
  const [bumpError, setBumpError] = useState<'empty' | 'rate' | 'failed' | null>(null)
  const [bumpNotice, setBumpNotice] = useState(false)
  const [mobile, setMobile] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 620px)').matches)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [secondaryTarget, setSecondaryTarget] = useState<HTMLDivElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(max-width: 620px)')
    const update = () => setMobile(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (!mobileMenuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('[role="dialog"]')) return
      if (!mobileMenuRef.current?.contains(event.target as Node)) setMobileMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest('[role="dialog"]')) return
      if (document.querySelector('.interest-selector__panel, .profile-menu__panel, .dropdown-menu')) return
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        mobileMenuButtonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileMenuOpen])
  const bumpInFlight = useRef(false)
  const pendingRequest = useRef<{ key: string; id: string } | null>(null)
  const { state, dispatch } = useAppState()
  const seenIdsRef = useRef(state.seenWebsiteIds)
  useEffect(() => { seenIdsRef.current = state.seenWebsiteIds }, [state.seenWebsiteIds])
  const navigate = useNavigate()
  const location = useLocation()
  const currentRoute = useRef(location.key)
  useEffect(() => { currentRoute.current = location.key }, [location.key])
  const currentInterest = useRef(state.selectedInterest)
  useEffect(() => { currentInterest.current = state.selectedInterest }, [state.selectedInterest])
  const isViewer = location.pathname.startsWith('/viewer/')
  const websiteId = isViewer ? location.pathname.slice('/viewer/'.length) : ''
  const activeWebsite = useQuery({
    queryKey: ['catalogue', websiteId],
    queryFn: () => catalogueAdapter.getById(websiteId),
    enabled: Boolean(websiteId),
  }).data

  async function bump() {
    if (bumpInFlight.current) return
    const routeKey = currentRoute.current
    const interestId = state.selectedInterest
    bumpInFlight.current = true
    setBumping(true)
    setBumpError(null)
    setBumpNotice(false)
    try {
      const recent = seenIdsRef.current.slice(-20)
      const requestKey = `${interestId}:${recent.join(',')}`
      if (pendingRequest.current?.key !== requestKey) {
        pendingRequest.current = { key: requestKey, id: crypto.randomUUID() }
      }
      const next = await discoveryAdapter.bump(
        interestId,
        recent,
        pendingRequest.current.id,
      )
      if (currentRoute.current !== routeKey || currentInterest.current !== interestId) return
      if (!next) { setBumpError('empty'); return }
      pendingRequest.current = null
      setBumpNotice(Boolean('exclusionsRelaxed' in next && next.exclusionsRelaxed))
      seenIdsRef.current = next.resetCycle
        ? [next.website.id]
        : [...seenIdsRef.current, next.website.id]
      dispatch({
        type: 'website-visited',
        websiteId: next.website.id,
        resetCycle: next.resetCycle,
      })
      navigate(paths.viewer(next.website.id))
    } catch (error) {
      if (currentRoute.current === routeKey && currentInterest.current === interestId) {
        setBumpError(error instanceof Error && error.message === 'RATE_LIMITED' ? 'rate' : 'failed')
      }
    } finally {
      bumpInFlight.current = false
      setBumping(false)
    }
  }

  return (
    <>
      {mobile ? <header className="topbar topbar--mobile">
        <WheelButton busy={bumping} onWheel={() => { setMobileMenuOpen(false); void bump() }} />
        <ReactionControls
          disabled={!isViewer || !activeWebsite}
          mobile
          onOpenAuth={() => { setMobileMenuOpen(false); onOpenAuth() }}
          originalUrl={activeWebsite?.originalUrl}
          secondaryTarget={secondaryTarget}
          websiteId={activeWebsite?.id}
        />
        <div className="mobile-menu" ref={mobileMenuRef}>
          <button aria-controls="mobile-menu-panel" aria-expanded={mobileMenuOpen} aria-label="More options" className="mobile-menu__trigger" onClick={() => setMobileMenuOpen((open) => !open)} ref={mobileMenuButtonRef} type="button">
            {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
          {mobileMenuOpen && <MenuDismissLayer onDismiss={() => setMobileMenuOpen(false)} />}
          {mobileMenuOpen && <div className="mobile-menu__panel" id="mobile-menu-panel">
            <strong className="mobile-menu__heading">More options</strong>
            <Link className="mobile-menu__link" onClick={() => setMobileMenuOpen(false)} to={paths.home}><House aria-hidden="true" />Home</Link>
            <IconButton icon={<Plus aria-hidden="true" />} label="Add a website" onClick={() => setSubmissionOpen(true)} showLabel />
            <div ref={setSecondaryTarget} />
            <InterestSelector onSelect={() => setMobileMenuOpen(false)} />
            <ProfileMenu onMenuAction={() => setMobileMenuOpen(false)} onOpenAuth={onOpenAuth} />
          </div>}
        </div>
      </header> : <header className="topbar">
        <div className="topbar__side topbar__side--left">
          <Link aria-label="flukewheel home" className="wordmark" to={paths.home}>
            <img alt="flukewheel" src={`${import.meta.env.BASE_URL}logo1.png`} />
          </Link>
          <div className="toolbar-actions">
            <IconButton
              icon={<Plus aria-hidden="true" />}
              label="Add a website"
              onClick={() => setSubmissionOpen(true)}
            />
            <ReactionControls
              disabled={!isViewer || !activeWebsite}
              onOpenAuth={onOpenAuth}
              originalUrl={activeWebsite?.originalUrl}
              websiteId={activeWebsite?.id}
            />
          </div>
        </div>

        <div className="topbar__centre">
          <WheelButton busy={bumping} onWheel={() => void bump()} />
          <InterestSelector />
        </div>

        <div className="topbar__side topbar__side--right">
          <ProfileMenu onOpenAuth={onOpenAuth} />
        </div>
      </header>}
      {bumpError && (
        <p className="toolbar-error" role="alert">
          {bumpError === 'empty'
            ? 'No eligible sites in this interest yet. Choose another interest.'
            : bumpError === 'rate'
              ? 'Too many spins right now. Please try again in a minute.'
            : "We couldn't find a discovery. Please try the Wheel again."}
        </p>
      )}
      {bumpNotice && <p className="toolbar-error" role="status">A recent discovery may repeat because this interest has few options.</p>}
      <SubmissionModal
        onClose={() => setSubmissionOpen(false)}
        open={submissionOpen}
      />
    </>
  )
}
