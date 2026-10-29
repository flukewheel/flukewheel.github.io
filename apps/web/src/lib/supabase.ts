import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readSupabaseEnvironment } from './config'
import type { Database } from './database.types'

let browserClient: SupabaseClient<Database> | null | undefined

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (browserClient !== undefined) return browserClient

  const environment = readSupabaseEnvironment()
  browserClient = environment
    ? createClient<Database>(
        environment.VITE_SUPABASE_URL,
        environment.VITE_SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        },
      )
    : null

  return browserClient
}
