import { appEntryUrl, rememberAuthReturn } from '../../features/auth/callback'
import { getSupabaseClient } from '../supabase'

function clientOrThrow() {
  const client = getSupabaseClient()
  if (!client) throw new Error('Authentication is not configured.')
  return client
}

export const authAdapter = {
  getClient: getSupabaseClient,
  isConfigured: () => getSupabaseClient() !== null,
  async signIn(email: string, password: string) {
    const { error } = await clientOrThrow().auth.signInWithPassword({ email, password })
    if (error) throw error
  },
  async signUp(email: string, password: string) {
    const { data, error } = await clientOrThrow().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: appEntryUrl() },
    })
    if (error) throw error
    return data.session !== null
  },
  async signInWithGoogle() {
    rememberAuthReturn()
    const { error } = await clientOrThrow().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: appEntryUrl() },
    })
    if (error) throw error
  },
  async sendPasswordReset(email: string) {
    const { error } = await clientOrThrow().auth.resetPasswordForEmail(email, {
      redirectTo: appEntryUrl(),
    })
    if (error) throw error
  },
  async updatePassword(password: string) {
    const { error } = await clientOrThrow().auth.updateUser({ password })
    if (error) throw error
  },
  async signOut() {
    const { error } = await clientOrThrow().auth.signOut()
    if (error) throw error
  },
}
