export type PendingAction =
  | { kind: 'love' | 'dislike' | 'bookmark'; websiteId: string; reason?: string }

const key = 'flukewheel:pending-action'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const reasons = new Set(['not_interested', 'low_quality', 'seen_before', 'broken', 'inappropriate'])

export function rememberPendingAction(action: PendingAction) {
  sessionStorage.setItem(key, JSON.stringify(action))
}

export function takePendingAction(): PendingAction | null {
  const raw = sessionStorage.getItem(key)
  sessionStorage.removeItem(key)
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as PendingAction
    if (uuid.test(value.websiteId) && ['love', 'dislike', 'bookmark'].includes(value.kind) && (!value.reason || reasons.has(value.reason))) return value
  } catch { /* Ignore malformed session data. */ }
  return null
}

export function clearPendingAction() { sessionStorage.removeItem(key) }
