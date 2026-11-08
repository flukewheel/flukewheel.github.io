import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command, mode }) => {
  const configuredUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL
  let supabaseOrigin = ''
  if (configuredUrl) {
    const parsed = new URL(configuredUrl)
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Invalid Supabase URL for CSP.')
    supabaseOrigin = parsed.origin
  }
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    `img-src 'self' data: ${supabaseOrigin}`.trim(),
    `connect-src 'self' ${supabaseOrigin}`.trim(),
    'frame-src http: https:',
    "form-action 'self'",
  ].join('; ')

  return {
    base: '/',
    plugins: [react(), tailwindcss(), {
      name: 'production-csp',
      transformIndexHtml(html) {
        if (command !== 'build') return html
        const marker = '<meta charset="UTF-8" />'
        if (!html.includes(marker)) throw new Error('CSP insertion point is missing.')
        return html.replace(marker, `${marker}\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`)
      },
    }],
    server: {
      port: 5173,
    },
    preview: {
      port: 4173,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
      css: true,
    },
  }
})
