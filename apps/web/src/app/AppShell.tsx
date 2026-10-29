import { Suspense, useState } from 'react'
import { Heart } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import { AuthModal } from '../components/AuthModal'
import { LoadingWheel } from '../components/LoadingWheel'
import { NavigationBar } from '../features/discovery/components/NavigationBar'

export function AppShell() {
  const [authOpen, setAuthOpen] = useState(false)
  const isViewer = useLocation().pathname.startsWith('/viewer/')

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <NavigationBar onOpenAuth={() => setAuthOpen(true)} />
      <Suspense fallback={<LoadingWheel />}>
        <Outlet context={{ openAuth: () => setAuthOpen(true) }} />
      </Suspense>
      {!isViewer && (
        <footer className="site-footer">
          made with <Heart aria-label="love" fill="currentColor" /> by Shaun Schwegler
        </footer>
      )}
      <AuthModal onClose={() => setAuthOpen(false)} open={authOpen} />
    </div>
  )
}
