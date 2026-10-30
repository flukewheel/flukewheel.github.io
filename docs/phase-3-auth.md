# Phase 3 authentication and profile development

The web app now provides email registration and sign-in, password recovery, Google sign-in entry points, persistent sessions, profile and interest editing, and trusted avatar uploads. Guests can still browse and Bump. A guest Love, Dislike or Bookmark is tied to the original website ID and resumes once after sign-in; closing authentication cancels it.

## Run locally

1. Start Docker Desktop, then run `npx supabase start` and `npm run dev` from the repository root. The app uses `http://127.0.0.1:5173/` and the local API uses port 54421.
2. Copy `supabase/functions/.env.example` to the ignored `supabase/functions/.env.local`. Add any other exact local frontend origins used for avatar testing, separated by commas.
3. Run `npx supabase functions serve process-avatar --env-file supabase/functions/.env.local` in another terminal. Avatar uploads go through this function. Direct browser writes to avatar storage remain disabled.
4. Local email messages appear in Mailpit at `http://127.0.0.1:54424/`. The local config currently signs up users without email confirmation; confirmation must be checked separately on the hosted development project.

## Hosted development setup

- The frontend is published at `https://flukewheel.github.io/`. The hosted Supabase Auth Site URL is set to that exact address, with `http://127.0.0.1:5175/` as an additional redirect for localhost checks. These values are tracked in `[remotes.hosted.auth]` in `supabase/config.toml`.
- Create a Google OAuth Web client in Google Cloud. Set its authorized redirect URI to `https://llzbpurpmcuiqcmserrd.supabase.co/auth/v1/callback`.
- Set `https://flukewheel.github.io` as a Google authorized JavaScript origin. During development, `http://127.0.0.1:5175` can remain as a second origin.
- In the `flukewheel-dev` Supabase project, enable the Google provider and enter the client ID and secret in the provider settings. Do not put the secret in a `VITE_` variable or the repository.
- Use the app entry URL for OAuth and email callbacks, since a physical `/auth/callback` path is not available on static hosting.
- The hosted `AVATAR_ALLOWED_ORIGINS` function secret is set to `https://flukewheel.github.io,http://127.0.0.1:5175`. Browser upload checks from both origins remain.
- Test a real hosted Google login, email confirmation, password recovery, refresh, logout, profile upload and return to a viewer route. OAuth PKCE links must return to the same browser context that started the flow; a missing verifier produces a retry message.

## Checks

Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` and `npm run test:e2e`. The Phase 3 browser journeys exercise local signup, profile and interest changes, avatar upload, logout, cancellation, a guest bookmark resumed on its original website, and password recovery through the static app entry.
