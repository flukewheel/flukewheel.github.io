import { appEntryUrl, clearAuthReturn, rememberAuthReturn } from '../../features/auth/callback'
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
    rememberAuthReturn()
    const { data, error } = await clientOrThrow().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: appEntryUrl() },
    })
    if (error) { clearAuthReturn(); throw error }
    if (data.session) clearAuthReturn()
    return data.session !== null
  },
  async signInWithGoogle() {
    rememberAuthReturn()
    const { error } = await clientOrThrow().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: appEntryUrl() },
    })
    if (error) { clearAuthReturn(); throw error }
  },
  async sendPasswordReset(email: string) {
    rememberAuthReturn()
    const { error } = await clientOrThrow().auth.resetPasswordForEmail(email, {
      redirectTo: appEntryUrl(),
    })
    if (error) { clearAuthReturn(); throw error }
  },
  async updatePassword(password: string) {
    const { error } = await clientOrThrow().auth.updateUser({ password })
    if (error) throw error
  },
  async signOut() {
    const { error } = await clientOrThrow().auth.signOut()
    if (error) throw error
  },
  async deleteAccount(email: string) {
    const client = clientOrThrow()
    const { data, error } = await client.functions.invoke('delete-account', { body: { confirm_email: email } })
    if (error) {
      const response = 'context' in error ? error.context : null
      const details = response instanceof Response ? await response.json().catch(() => null) as { message?: string } | null : null
      throw new Error(details?.message ?? 'Your account could not be deleted. Please try again.')
    }
    if (data?.code !== 'OK') throw new Error('Your account could not be deleted. Please try again.')
    await client.auth.signOut({ scope: 'local' })
  },
}
