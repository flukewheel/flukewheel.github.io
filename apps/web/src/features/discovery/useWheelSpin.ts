import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppState } from '../../app/AppState'
import { paths } from '../../app/paths'
import { discoveryAdapter } from '../../lib/adapters'

export function useWheelSpin() {
  const [bumping, setBumping] = useState(false)
  const [bumpError, setBumpError] = useState<'empty' | 'rate' | 'failed' | null>(null)
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
      const next = await discoveryAdapter.bump(interestId, recent, pendingRequest.current.id)
      if (currentRoute.current !== routeKey || currentInterest.current !== interestId) return
      if (!next) { setBumpError('empty'); return }
      pendingRequest.current = null
      setBumpNotice(Boolean('exclusionsRelaxed' in next && next.exclusionsRelaxed))
      seenIdsRef.current = next.resetCycle
        ? [next.website.id]
        : [...seenIdsRef.current, next.website.id]
      dispatch({ type: 'website-visited', websiteId: next.website.id, resetCycle: next.resetCycle })
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

  return { bump, bumping, bumpError, bumpNotice }
}
