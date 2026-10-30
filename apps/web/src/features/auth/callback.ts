import { getSupabaseClient } from '../../lib/supabase'

const returnKey = 'flukewheel:auth-return'
const callbackErrorKey = 'flukewheel:auth-callback-error'
const recoveryKey = 'flukewheel:auth-recovery'

export function rememberAuthReturn() {
  const route = window.location.hash.startsWith('#/') ? window.location.hash : '#/'
  sessionStorage.setItem(returnKey, route)
}

export function clearAuthReturn() { sessionStorage.removeItem(returnKey) }

function safeReturnRoute(value: string | null): string {
  if (!value || !/^#\/(?:[A-Za-z0-9_/-]*)$/.test(value) || value.includes('//')) return '#/'
  return value
}

export function takeCallbackError() {
  return sessionStorage.getItem(callbackErrorKey)
}

export function takeRecoveryMode() {
  return sessionStorage.getItem(recoveryKey) === 'true'
}

export function clearCallbackFlags() {
  sessionStorage.removeItem(callbackErrorKey)
  sessionStorage.removeItem(recoveryKey)
}

export function appEntryUrl() {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href
}

export async function processAuthCallback() {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error_description') ?? url.searchParams.get('error')
  if (!code && !error) return
  if (url.searchParams.get('type') === 'recovery') sessionStorage.setItem(recoveryKey, 'true')
  const savedRoute = safeReturnRoute(sessionStorage.getItem(returnKey))
  sessionStorage.removeItem(returnKey)
  const client = getSupabaseClient()
  if (error) sessionStorage.setItem(callbackErrorKey, 'Authentication was cancelled or could not be completed. Please try again.')
  else if (!client) sessionStorage.setItem(callbackErrorKey, 'Authentication is not configured.')
  else {
    try {
      const { data, error: exchangeError } = await client.auth.exchangeCodeForSession(code!)
      if ('redirectType' in data && data.redirectType === 'recovery') sessionStorage.setItem(recoveryKey, 'true')
      if (exchangeError) sessionStorage.setItem(callbackErrorKey, 'The sign-in link could not be completed. Please try again from this browser.')
    } catch {
      sessionStorage.setItem(callbackErrorKey, 'The sign-in link could not be completed. Please check your connection and try again.')
    }
  }
  url.searchParams.delete('code')
  url.searchParams.delete('error')
  url.searchParams.delete('error_code')
  url.searchParams.delete('error_description')
  url.searchParams.delete('type')
  url.hash = savedRoute
  window.history.replaceState(null, '', url)
}
