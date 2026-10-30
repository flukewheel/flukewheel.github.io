import { Component, type ErrorInfo, type ReactNode } from 'react'
import { hashHref, paths } from './paths'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled flukewheel error', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="route-state" role="alert">
          <p className="eyebrow">Something went astray</p>
          <h1>Let’s get you back to discovery.</h1>
          <p>The page could not be displayed safely.</p>
          <a className="primary-link" href={hashHref(paths.home)}>
            Return home
          </a>
        </main>
      )
    }

    return this.props.children
  }
}
