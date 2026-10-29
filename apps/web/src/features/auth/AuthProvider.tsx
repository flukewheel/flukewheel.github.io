import { createContext, type PropsWithChildren, useContext } from 'react'

interface AuthContextValue {
  user: null
}

const AuthContext = createContext<AuthContextValue>({ user: null })

export function AuthProvider({ children }: PropsWithChildren) {
  return <AuthContext.Provider value={{ user: null }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
