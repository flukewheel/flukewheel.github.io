import { useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react'
import { authAdapter } from '../../lib/adapters/auth'
import type { Database } from '../../lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  avatarUrl: string | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()
  const client = authAdapter.getClient()
  const userId = user?.id

  useEffect(() => {
    if (!client) { queueMicrotask(() => setLoading(false)); return }
    let alive = true
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!alive) return
      setUser(session?.user && !session.user.is_anonymous ? session.user : null)
      setLoading(false)
    })
    void client.auth.getSession().then(({ data }) => {
      if (!alive) return
      setUser(data.session?.user && !data.session.user.is_anonymous ? data.session.user : null)
      setLoading(false)
    }).catch(() => { if (alive) setLoading(false) })
    return () => { alive = false; subscription.unsubscribe() }
  }, [client])

  useEffect(() => {
    if (!userId || !client) {
      queueMicrotask(() => { setProfile(null); setAvatarUrl(null) })
      return
    }
    let alive = true
    const load = async () => {
      let { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (!error && !data) {
        const inserted = await client.from('profiles').insert({ id: userId })
        if (!inserted.error || inserted.error.code === '23505') {
          const reread = await client.from('profiles').select('*').eq('id', userId).maybeSingle()
          data = reread.data
          error = reread.error
        } else error = inserted.error
      }
      if (!alive || error) return
      setProfile(data)
      if (data?.avatar_path) {
        const signed = await client.storage.from('avatars').createSignedUrl(data.avatar_path, 3600)
        if (alive) setAvatarUrl(signed.data?.signedUrl ?? null)
      } else setAvatarUrl(null)
    }
    void load()
    return () => { alive = false }
  }, [client, userId])

  async function refreshProfile() {
    if (!client || !user) return
    const { data, error } = await client.from('profiles').select('*').eq('id', user.id).single()
    if (error) throw error
    setProfile(data)
    if (data.avatar_path) {
      const signed = await client.storage.from('avatars').createSignedUrl(data.avatar_path, 3600)
      setAvatarUrl(signed.data?.signedUrl ?? null)
    } else setAvatarUrl(null)
  }

  async function signOut() {
    await authAdapter.signOut()
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'catalogue' && query.queryKey[0] !== 'categories' })
    setProfile(null)
    setAvatarUrl(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, avatarUrl, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
