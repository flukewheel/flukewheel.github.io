import { getSupabaseClient } from '../supabase'

export const authAdapter = {
  getClient: getSupabaseClient,
  isConfigured: () => getSupabaseClient() !== null,
}
