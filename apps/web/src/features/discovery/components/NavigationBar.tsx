import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
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
  const { state, dispatch } = useAppState()
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
    setBumping(true)
    setBumpError(false)
    try {
      const next = await discoveryAdapter.bump(
        state.selectedInterest,
        state.seenWebsiteIds,
      )
      if (!next) return
      dispatch({
        type: 'website-visited',
        websiteId: next.website.id,
        resetCycle: next.resetCycle,
      })
      navigate(paths.viewer(next.website.id))
    } catch {
      setBumpError(true)
    } finally {
      setBumping(false)
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar__side topbar__side--left">
          <Link aria-label="flukewheel home" className="wordmark" to={paths.home}>
            flukewheel
          </Link>
          <div className="toolbar-actions">
            <IconButton
              icon={<Plus aria-hidden="true" />}
              label="Add a website"
              onClick={() => setSubmissionOpen(true)}
            />
            <ReactionControls
              disabled={!isViewer || !activeWebsite}
            />
          </div>
        </div>

        <div className="topbar__centre">
          <BumpButton busy={bumping} onBump={() => void bump()} />
        </div>

        <div className="topbar__side topbar__side--right">
          <InterestSelector />
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
