import { Suspense, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import { AuthModal } from '../components/AuthModal'
import { LoadingWheel } from '../components/LoadingWheel'
import { NavigationBar } from '../features/discovery/components/NavigationBar'
import { clearCallbackFlags, takeCallbackError, takeRecoveryMode } from '../features/auth/callback'
import { useAuth } from '../features/auth/AuthProvider'
import { CompleteProfile } from '../features/auth/CompleteProfile'
import { clearPendingAction, takePendingAction } from '../features/auth/pendingAction'
import { interactionAdapter } from '../lib/adapters/interactions'

export function AppShell() {
  const [callbackError] = useState(takeCallbackError)
  const [recoveryMode] = useState(takeRecoveryMode)
  const [authOpen, setAuthOpen] = useState(Boolean(callbackError || recoveryMode))
  const [pendingError, setPendingError] = useState<string | null>(null)
  const [dismissedCompletion, setDismissedCompletion] = useState(() => sessionStorage.getItem('flukewheel:profile-completion-dismissed'))
  const { user, profile } = useAuth()
  const userId = user?.id
  const queryClient = useQueryClient()
  const isViewer = useLocation().pathname.startsWith('/viewer/')

  useEffect(() => { clearCallbackFlags() }, [])

  useEffect(() => {
    if (!userId) return
    const pending = takePendingAction()
    if (!pending) return
    const run = async () => {
      if (pending.kind === 'bookmark') await interactionAdapter.saveBookmark(pending.websiteId)
      else await interactionAdapter.setReaction(pending.websiteId, pending.kind, pending.reason ?? null)
      await queryClient.invalidateQueries({ queryKey: ['interaction', userId, pending.websiteId] })
    }
    void run().catch(() => setPendingError('Your saved action could not be completed. Please try again.'))
  }, [userId, queryClient])

  function cancelAuth() { clearPendingAction(); setAuthOpen(false) }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <NavigationBar onOpenAuth={() => setAuthOpen(true)} />
      {pendingError && <p className="toolbar-error" role="alert">{pendingError}</p>}
      <Suspense fallback={<LoadingWheel />}>
        <Outlet context={{ openAuth: () => setAuthOpen(true) }} />
      </Suspense>
      {!isViewer && (
        <footer className="site-footer">
          made with <Heart aria-label="love" fill="currentColor" /> by Shaun Schwegler
        </footer>
      )}
      {authOpen && <AuthModal initialError={callbackError} initialMode={recoveryMode ? 'new-password' : 'login'} onAuthenticated={() => setAuthOpen(false)} onClose={cancelAuth} open />}
      {!authOpen && userId && profile?.id === userId && !profile.username && dismissedCompletion !== userId && (
        <CompleteProfile
          onComplete={() => { sessionStorage.removeItem('flukewheel:profile-completion-dismissed'); setDismissedCompletion(null) }}
          onDismiss={() => { sessionStorage.setItem('flukewheel:profile-completion-dismissed', userId); setDismissedCompletion(userId) }}
        />
      )}
    </div>
  )
}
