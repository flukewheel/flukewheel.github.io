import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { processAuthCallback } from './features/auth/callback'
import './styles.css'

void processAuthCallback().finally(async () => {
  const { App } = await import('./app/App')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
