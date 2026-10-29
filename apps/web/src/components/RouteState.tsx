import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../app/paths'

interface RouteStateProps {
  eyebrow: string
  title: string
  children: ReactNode
  alert?: boolean
}

export function RouteState({ eyebrow, title, children, alert = false }: RouteStateProps) {
  return (
    <main className="route-state" id="main-content" role={alert ? 'alert' : undefined}>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </main>
  )
}

export function UnauthorisedState({ title }: { title: string }) {
  return (
    <RouteState eyebrow="Sign in required" title={title}>
      <p>Log in to use this area. Your public discovery feed is still available.</p>
      <Link className="primary-link" to={paths.home}>
        Return home
      </Link>
    </RouteState>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="inline-state inline-state--empty">{children}</div>
}
