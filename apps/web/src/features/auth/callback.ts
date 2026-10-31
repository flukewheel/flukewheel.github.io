import { getSupabaseClient } from '../../lib/supabase'

const returnKey = 'flukewheel:auth-return'
const callbackErrorKey = 'flukewheel:auth-callback-error'
const recoveryKey = 'flukewheel:auth-recovery'
const returnLifetime = 60 * 60 * 1000

export function rememberAuthReturn() {
  const route = window.location.hash.startsWith('#/') ? window.location.hash : '#/'
  sessionStorage.setItem(returnKey, route)
  localStorage.setItem(returnKey, JSON.stringify({ route, savedAt: Date.now() }))
}

export function clearAuthReturn() {
  sessionStorage.removeItem(returnKey)
  localStorage.removeItem(returnKey)
}

function safeReturnRoute(value: string | null): string {
  if (!value || !/^#\/(?:[A-Za-z0-9_/-]*)$/.test(value) || value.includes('//')) return '#/'
  return value
}

function takeAuthReturn(): string {
  const inTab = sessionStorage.getItem(returnKey)
  const acrossTabs = localStorage.getItem(returnKey)
  clearAuthReturn()
  if (inTab) return safeReturnRoute(inTab)
  if (!acrossTabs) return '#/'
  try {
    const saved = JSON.parse(acrossTabs) as { route?: string; savedAt?: number }
    if (typeof saved.savedAt === 'number' && Date.now() - saved.savedAt <= returnLifetime && Date.now() >= saved.savedAt) {
      return safeReturnRoute(saved.route ?? null)
    }
  } catch { /* Ignore malformed or stale browser state. */ }
  return '#/'
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
  const fragment = url.hash.startsWith('#/') ? null : new URLSearchParams(url.hash.slice(1))
  const accessToken = fragment?.get('access_token')
  const refreshToken = fragment?.get('refresh_token')
  const error = url.searchParams.get('error_description') ?? url.searchParams.get('error') ?? fragment?.get('error_description') ?? fragment?.get('error')
  if (!code && !accessToken && !error) return
  const recovery = url.searchParams.get('type') === 'recovery' || fragment?.get('type') === 'recovery'
  const savedRoute = takeAuthReturn()
  clearCallbackFlags()
  if (recovery) sessionStorage.setItem(recoveryKey, 'true')
  url.searchParams.delete('code')
  url.searchParams.delete('error')
  url.searchParams.delete('error_code')
  url.searchParams.delete('error_description')
  url.searchParams.delete('type')
  url.hash = savedRoute
  window.history.replaceState(null, '', url)
  const client = getSupabaseClient()
  if (error) sessionStorage.setItem(callbackErrorKey, 'Authentication was cancelled or could not be completed. Please try again.')
  else if (!client) sessionStorage.setItem(callbackErrorKey, 'Authentication is not configured.')
  else {
    try {
      const { data, error: exchangeError } = code
        ? await client.auth.exchangeCodeForSession(code)
        : refreshToken
          ? await client.auth.setSession({ access_token: accessToken!, refresh_token: refreshToken })
          : { data: null, error: new Error('Missing refresh token') }
      if (data && 'redirectType' in data && data.redirectType === 'recovery') sessionStorage.setItem(recoveryKey, 'true')
      if (exchangeError) sessionStorage.setItem(callbackErrorKey, 'The sign-in link could not be completed. Please try again from this browser.')
    } catch {
      sessionStorage.setItem(callbackErrorKey, 'The sign-in link could not be completed. Please check your connection and try again.')
    }
  }
  if (sessionStorage.getItem(callbackErrorKey)) sessionStorage.removeItem(recoveryKey)
}
