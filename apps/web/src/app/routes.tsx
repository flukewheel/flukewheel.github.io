import { lazy, useEffect } from 'react'
import { Navigate, useOutletContext, useRouteError } from 'react-router-dom'
import { RouteState, UnauthorisedState } from '../components/RouteState'
import { useAuth } from '../features/auth/AuthProvider'
import { DiscoveryFeed } from '../features/discovery/DiscoveryFeed'
import { CatalogueBrowse } from '../features/discovery/CatalogueBrowse'
import { ProfileSettings } from '../features/auth/ProfileSettings'
import { BookmarkCollection } from '../features/engagement/BookmarkCollection'
import { BrowsingHistory } from '../features/engagement/BrowsingHistory'
import { AppShell } from './AppShell'
import { paths, routePatterns } from './paths'

const WebsiteViewer = lazy(() => import('../features/viewer/WebsiteViewer'))
const AdminPage = lazy(() => import('../features/admin/AdminPage').then((module) => ({ default: module.AdminPage })))

interface ShellContext {
  openAuth: () => void
  spinWheel: () => void
  spinBusy: boolean
}

function FeedRoute() {
  const { openAuth, spinWheel, spinBusy } = useOutletContext<ShellContext>()
  return <DiscoveryFeed onOpenAuth={openAuth} onSpin={spinWheel} spinBusy={spinBusy} />
}

function SettingsRoute() {
  const { user, loading } = useAuth()
  if (loading) return <RouteState eyebrow="Account" title="Loading your account…"><p>Please wait.</p></RouteState>
  if (!user) return <UnauthorisedState title="Profile settings are private." />
  return <ProfileSettings />
}

function BookmarkRoute() {
  const { user, loading } = useAuth()
  if (loading) return <RouteState eyebrow="Account" title="Loading your account…"><p>Please wait.</p></RouteState>
  if (!user) return <UnauthorisedState title="Bookmarks are private." />
  return <BookmarkCollection />
}

function HistoryRoute() {
  const { user, loading } = useAuth()
  if (loading) return <RouteState eyebrow="Account" title="Loading your account…"><p>Please wait.</p></RouteState>
  if (!user) return <UnauthorisedState title="Browsing history is private." />
  return <BrowsingHistory />
}

function AdminRoute() {
  const { user, loading } = useAuth()
  if (loading) return <RouteState eyebrow="Account" title="Loading your account…"><p>Please wait.</p></RouteState>
  if (!user) return <UnauthorisedState title="Administration is private." />
  return <AdminPage />
}

export function RouteError() {
  const error = useRouteError()

  useEffect(() => {
    console.error('Route rendering failed', error)
  }, [error])

  return (
    <RouteState alert eyebrow="Something went astray" title="Let’s get you back to discovery.">
      <p>The page could not be displayed safely.</p>
      <a className="primary-link" href={`#${paths.home}`}>
        Return home
      </a>
    </RouteState>
  )
}

export const routes = [
  {
    path: routePatterns.home,
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <FeedRoute /> },
      { path: routePatterns.category, element: <CatalogueBrowse /> },
      { path: routePatterns.recent, element: <CatalogueBrowse /> },
      { path: routePatterns.viewer, element: <WebsiteViewer /> },
      { path: routePatterns.settings, element: <SettingsRoute /> },
      {
        path: routePatterns.bookmarks,
        element: <BookmarkRoute />,
      },
      {
        path: routePatterns.history,
        element: <HistoryRoute />,
      },
      {
        path: routePatterns.admin,
        element: <AdminRoute />,
      },
      { path: '*', element: <Navigate replace to={paths.home} /> },
    ],
  },
]
