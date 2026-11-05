import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react'

const storageKey = 'flukewheel:discovery-session'
interface AppState {
  selectedInterest: string
  seenWebsiteIds: string[]
}

type Action =
  | { type: 'interest-selected'; interestId: string }
  | { type: 'website-visited'; websiteId: string; resetCycle?: boolean }

const initialState: AppState = {
  selectedInterest: 'all',
  seenWebsiteIds: [],
}

function readInitialState(): AppState {
  try {
    const stored = sessionStorage.getItem(storageKey)
    if (!stored) return initialState
    const value = JSON.parse(stored) as Partial<AppState>
    return {
      selectedInterest:
        typeof value.selectedInterest === 'string'
          ? value.selectedInterest
          : 'all',
      seenWebsiteIds: [...new Set(
        (Array.isArray(value.seenWebsiteIds)
          ? value.seenWebsiteIds
          : Array.isArray((value as { recentWebsiteIds?: unknown }).recentWebsiteIds)
            ? (value as { recentWebsiteIds: unknown[] }).recentWebsiteIds
            : []
        ).filter((id): id is string => typeof id === 'string'),
      )].slice(-20),
    }
  } catch {
    return initialState
  }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'interest-selected':
      return { ...state, selectedInterest: action.interestId }
    case 'website-visited':
      if (!action.resetCycle && state.seenWebsiteIds.includes(action.websiteId)) return state
      return {
        ...state,
        seenWebsiteIds: action.resetCycle
          ? [action.websiteId]
          : [...state.seenWebsiteIds, action.websiteId].slice(-20),
      }
  }
}

interface AppStateContextValue {
  state: AppState
  dispatch: Dispatch<Action>
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

export function AppStateProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, undefined, readInitialState)

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(state))
  }, [state])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const value = useContext(AppStateContext)
  if (!value) throw new Error('useAppState must be used within AppStateProvider')
  return value
}
