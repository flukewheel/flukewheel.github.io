import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppState } from '../../../app/AppState'
import { paths } from '../../../app/paths'
import { IconButton } from '../../../components/IconButton'
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
  const [bumpError, setBumpError] = useState<'empty' | 'failed' | null>(null)
  const [bumpNotice, setBumpNotice] = useState(false)
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
    } catch {
      if (currentRoute.current === routeKey && currentInterest.current === interestId) setBumpError('failed')
    } finally {
      bumpInFlight.current = false
      setBumping(false)
    }
  }

  return (
    <>
      <header className="topbar">
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
      </header>
      {bumpError && (
        <p className="toolbar-error" role="alert">
          {bumpError === 'empty'
            ? 'No eligible sites in this interest yet. Choose another interest.'
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
