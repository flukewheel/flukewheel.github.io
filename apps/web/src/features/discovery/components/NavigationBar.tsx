import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppState } from '../../../app/AppState'
import { paths } from '../../../app/paths'
import { IconButton } from '../../../components/IconButton'
import { catalogueAdapter, discoveryAdapter } from '../../../lib/adapters'
import { SubmissionModal } from '../../submissions/SubmissionModal'
import { BumpButton } from './BumpButton'
import { InterestSelector } from './InterestSelector'
import { ProfileMenu } from './ProfileMenu'
import { ReactionControls } from './ReactionControls'

interface NavigationBarProps {
  onOpenAuth: () => void
}

export function NavigationBar({ onOpenAuth }: NavigationBarProps) {
  const [submissionOpen, setSubmissionOpen] = useState(false)
  const [bumping, setBumping] = useState(false)
  const [bumpError, setBumpError] = useState(false)
  const bumpInFlight = useRef(false)
  const { state, dispatch } = useAppState()
  const seenIdsRef = useRef(state.seenWebsiteIds)
  useEffect(() => { seenIdsRef.current = state.seenWebsiteIds }, [state.seenWebsiteIds])
  const navigate = useNavigate()
  const location = useLocation()
  const isViewer = location.pathname.startsWith('/viewer/')
  const websiteId = isViewer ? location.pathname.slice('/viewer/'.length) : ''
  const activeWebsite = useQuery({
    queryKey: ['catalogue', websiteId],
    queryFn: () => catalogueAdapter.getById(websiteId),
    enabled: Boolean(websiteId),
  }).data

  async function bump() {
    if (bumpInFlight.current) return
    bumpInFlight.current = true
    setBumping(true)
    setBumpError(false)
    try {
      const next = await discoveryAdapter.bump(
        state.selectedInterest,
        seenIdsRef.current,
      )
      if (!next) return
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
      setBumpError(true)
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
              websiteId={activeWebsite?.id}
            />
          </div>
        </div>

        <div className="topbar__centre">
          <BumpButton busy={bumping} onBump={() => void bump()} />
          <InterestSelector />
        </div>

        <div className="topbar__side topbar__side--right">
          <ProfileMenu onOpenAuth={onOpenAuth} />
        </div>
      </header>
      {bumpError && (
        <p className="toolbar-error" role="alert">
          We couldn't find a discovery. Please try Bump! again.
        </p>
      )}
      <SubmissionModal
        onClose={() => setSubmissionOpen(false)}
        open={submissionOpen}
      />
    </>
  )
}
