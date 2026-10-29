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
const recentLimit = 20

interface AppState {
  selectedInterest: string
  recentWebsiteIds: string[]
}

type Action =
  | { type: 'interest-selected'; interestId: string }
  | { type: 'website-visited'; websiteId: string }

const initialState: AppState = {
  selectedInterest: 'all',
  recentWebsiteIds: [],
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
      recentWebsiteIds: Array.isArray(value.recentWebsiteIds)
        ? value.recentWebsiteIds.filter((id): id is string => typeof id === 'string').slice(0, recentLimit)
        : [],
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
      return {
        ...state,
        recentWebsiteIds: [
          action.websiteId,
          ...state.recentWebsiteIds.filter((id) => id !== action.websiteId),
        ].slice(0, recentLimit),
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
