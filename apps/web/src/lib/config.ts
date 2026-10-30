import { z } from 'zod'

const supabaseEnvironmentSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})

export type SupabaseEnvironment = z.infer<typeof supabaseEnvironmentSchema>

export function readSupabaseEnvironment(): SupabaseEnvironment | null {
  const result = supabaseEnvironmentSchema.safeParse(import.meta.env)
  return result.success ? result.data : null
}
