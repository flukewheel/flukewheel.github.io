import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AuthModal } from '../components/AuthModal'
import { NavigationBar } from '../features/discovery/components/NavigationBar'

export function AppShell() {
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <NavigationBar onOpenAuth={() => setAuthOpen(true)} />
      <Suspense
        fallback={
          <main className="route-state" aria-live="polite">
            <p>Loading discovery…</p>
          </main>
        }
      >
        <Outlet context={{ openAuth: () => setAuthOpen(true) }} />
      </Suspense>
      <AuthModal onClose={() => setAuthOpen(false)} open={authOpen} />
    </div>
  )
}
