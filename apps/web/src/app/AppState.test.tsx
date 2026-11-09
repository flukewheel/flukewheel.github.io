import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppStateProvider, useAppState } from './AppState'

describe('Wheel session progress', () => {
  beforeEach(() => sessionStorage.clear())

  it('keeps the full cycle across a reload and resets only after a completed cycle', () => {
    const { result, unmount } = renderHook(() => useAppState(), { wrapper: AppStateProvider })
    const ids = Array.from({ length: 109 }, (_, index) => `site-${index}`)
    act(() => {
      for (const websiteId of ids) result.current.dispatch({ type: 'website-visited', websiteId })
    })
    expect(result.current.state.seenWebsiteIds).toEqual(ids)
    expect(result.current.state.recentWebsiteIds).toEqual(ids.slice(-20))
    unmount()

    const restored = renderHook(() => useAppState(), { wrapper: AppStateProvider })
    expect(restored.result.current.state.seenWebsiteIds).toEqual(ids)
    act(() => restored.result.current.dispatch({ type: 'website-visited', websiteId: ids[0], resetCycle: true }))
    expect(restored.result.current.state.seenWebsiteIds).toEqual([ids[0]])
  })

  it('keeps a category repeat in the recent window without duplicating the cycle set', () => {
    const { result } = renderHook(() => useAppState(), { wrapper: AppStateProvider })
    act(() => {
      result.current.dispatch({ type: 'website-visited', websiteId: 'first' })
      result.current.dispatch({ type: 'website-visited', websiteId: 'second' })
      result.current.dispatch({ type: 'website-visited', websiteId: 'first' })
    })
    expect(result.current.state.seenWebsiteIds).toEqual(['second', 'first'])
    expect(result.current.state.recentWebsiteIds).toEqual(['first', 'second', 'first'])
  })

  it('does not record the same arrival twice when the Wheel and viewer both report it', () => {
    const { result } = renderHook(() => useAppState(), { wrapper: AppStateProvider })
    act(() => {
      result.current.dispatch({ type: 'website-visited', websiteId: 'first' })
      result.current.dispatch({ type: 'website-visited', websiteId: 'first' })
    })
    expect(result.current.state.seenWebsiteIds).toEqual(['first'])
    expect(result.current.state.recentWebsiteIds).toEqual(['first'])
  })
})
