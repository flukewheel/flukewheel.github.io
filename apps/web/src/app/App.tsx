import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { AppStateProvider } from './AppState'
import { AuthProvider } from '../features/auth/AuthProvider'
import { ErrorBoundary } from './ErrorBoundary'
import { routes } from './routes'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
})

const router = createHashRouter(routes)

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppStateProvider>
            <RouterProvider router={router} />
          </AppStateProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
