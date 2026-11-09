import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { maxSessionWebsites, useAppState } from '../../app/AppState'
import { paths } from '../../app/paths'
import { discoveryAdapter } from '../../lib/adapters'

export function useWheelSpin() {
  const [bumping, setBumping] = useState(false)
  const [bumpError, setBumpError] = useState<'empty' | 'rate' | 'failed' | null>(null)
  const [bumpNotice, setBumpNotice] = useState<'cycle-reset' | 'relaxed' | null>(null)
  const bumpInFlight = useRef(false)
  const pendingRequest = useRef<{ key: string; id: string } | null>(null)
  const { state, dispatch } = useAppState()
  const seenIdsRef = useRef(state.seenWebsiteIds)
  const recentIdsRef = useRef(state.recentWebsiteIds)
  useEffect(() => { seenIdsRef.current = state.seenWebsiteIds }, [state.seenWebsiteIds])
  useEffect(() => { recentIdsRef.current = state.recentWebsiteIds }, [state.recentWebsiteIds])
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
    setBumpNotice(null)
    try {
      const exclusions = interestId === 'all' ? seenIdsRef.current : recentIdsRef.current
      const requestKey = `${interestId}:${exclusions.join(',')}`
      if (pendingRequest.current?.key !== requestKey) {
        pendingRequest.current = { key: requestKey, id: crypto.randomUUID() }
      }
      const next = await discoveryAdapter.bump(interestId, exclusions, pendingRequest.current.id)
      if (currentRoute.current !== routeKey || currentInterest.current !== interestId) return
      if (!next) { setBumpError('empty'); return }
      pendingRequest.current = null
      const resetCycle = interestId === 'all' && next.resetCycle
      setBumpNotice(resetCycle ? 'cycle-reset' : 'exclusionsRelaxed' in next && next.exclusionsRelaxed ? 'relaxed' : null)
      seenIdsRef.current = resetCycle
        ? [next.website.id]
        : seenIdsRef.current.includes(next.website.id)
          ? [...seenIdsRef.current.filter((id) => id !== next.website.id), next.website.id]
          : [...seenIdsRef.current, next.website.id].slice(-maxSessionWebsites)
      recentIdsRef.current = [...recentIdsRef.current, next.website.id].slice(-20)
      dispatch({ type: 'website-visited', websiteId: next.website.id, resetCycle })
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
