import { lazy, useEffect } from 'react'
import { Navigate, useOutletContext, useRouteError } from 'react-router-dom'
import { RouteState, UnauthorisedState } from '../components/RouteState'
import { useAuth } from '../features/auth/AuthProvider'
import { DiscoveryFeed } from '../features/discovery/DiscoveryFeed'
import { ProfileSettings } from '../features/auth/ProfileSettings'
import { BookmarkCollection } from '../features/engagement/BookmarkCollection'
import { AppShell } from './AppShell'
import { paths, routePatterns } from './paths'

const WebsiteViewer = lazy(() => import('../features/viewer/WebsiteViewer'))

interface ShellContext {
  openAuth: () => void
}

function FeedRoute() {
  const { openAuth } = useOutletContext<ShellContext>()
  return <DiscoveryFeed onOpenAuth={openAuth} />
}

function ProtectedPlaceholder({ title, privateTitle }: { title: string; privateTitle: string }) {
  const { user, loading } = useAuth()

  if (loading) return <RouteState eyebrow="Account" title="Loading your account…"><p>Please wait.</p></RouteState>
  if (!user) return <UnauthorisedState title={privateTitle} />

  return (
    <RouteState eyebrow="Coming in a later phase" title={title}>
      <p>The route boundary is ready for its secure data-backed workflow.</p>
    </RouteState>
  )
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
      { path: routePatterns.category, element: <FeedRoute /> },
      { path: routePatterns.viewer, element: <WebsiteViewer /> },
      { path: routePatterns.settings, element: <SettingsRoute /> },
      {
        path: routePatterns.bookmarks,
        element: <BookmarkRoute />,
      },
      {
        path: routePatterns.history,
        element: <ProtectedPlaceholder title="Browsing history" privateTitle="Browsing history is private." />,
      },
      {
        path: routePatterns.admin,
        element: <ProtectedPlaceholder title="Administration" privateTitle="Administration is private." />,
      },
      { path: '*', element: <Navigate replace to={paths.home} /> },
    ],
  },
]
