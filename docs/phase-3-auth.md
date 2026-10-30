# Phase 3 authentication and profile development

The web app provides email registration and sign-in, password recovery, Google sign-in, persistent sessions, profile and interest editing, and trusted avatar uploads. New accounts with no username see a short completion step; a duplicate username produces a correction prompt. Guests can still browse and Bump. A guest Love, Dislike or Bookmark is tied to the original website ID and resumes once after sign-in; closing authentication cancels it.

## Run locally

1. Start Docker Desktop, then run `npx supabase start` and `npm run dev` from the repository root. The app uses `http://127.0.0.1:5173/` and the local API uses port 54421.
2. Copy `supabase/functions/.env.example` to the ignored `supabase/functions/.env.local`. Add any other exact local frontend origins used for avatar testing, separated by commas.
3. Run `npx supabase functions serve process-avatar --env-file supabase/functions/.env.local` in another terminal. Avatar uploads go through this function. Direct browser writes to avatar storage remain disabled.
4. Local email messages appear in Mailpit at `http://127.0.0.1:54424/`. The local config currently signs up users without email confirmation; confirmation must be checked separately on the hosted development project.

## Hosted development setup

- The frontend is published at `https://flukewheel.github.io/`. The hosted Supabase Auth Site URL is set to that exact address, with `http://127.0.0.1:5175/` as an additional redirect for localhost checks. These values are tracked in `[remotes.hosted.auth]` in `supabase/config.toml`.
- The Google OAuth Web client has `https://llzbpurpmcuiqcmserrd.supabase.co/auth/v1/callback` as its authorized redirect URI and `https://flukewheel.github.io` as an authorized JavaScript origin.
- Google is enabled in the hosted `flukewheel-dev` Supabase project. The public client ID and an environment-variable secret reference are recorded in `[remotes.hosted.auth.external.google]`; the secret itself remains outside the repository.
- Use the app entry URL for OAuth and email callbacks, since a physical `/auth/callback` path is not available on static hosting.
- The hosted `AVATAR_ALLOWED_ORIGINS` function secret is set to `https://flukewheel.github.io,http://127.0.0.1:5175`. Browser upload checks from both origins remain.
- The live Google button has been verified to reach Google's sign-in page with the expected client and callback. The project owner completed a real Google sign-in and confirmed that the browser returned to the site signed in. The read-only hosted config comparison found no drift. Hosted email confirmation, password recovery, refresh, logout, profile upload and return to a viewer route still need checks with an account and inbox available in the browser. OAuth PKCE links must return to the same browser context that started the flow; a missing verifier produces a retry message.

## Checks

Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` and `npm run test:e2e`. The Phase 3 browser journeys exercise local signup, username completion and collision, profile and interest changes, avatar upload, logout, cancellation, a guest bookmark resumed on its original website, password recovery back to a viewer, and callback error restoration of a viewer and interest.

## Hosted completion checks

These require the account owner or a controlled test inbox; do not put passwords, login codes or OAuth secrets in the repository or chat.

1. On the live site, begin email registration from a viewer route using a new address you can read. Open its confirmation link in the same browser. Check that the viewer returns, the username step appears, and the chosen username survives a refresh. If the link was opened in a different browser context, use the retry or sign-in path.
2. Log out, start password recovery from a viewer route, and open the email link in the same browser. Set a new password, verify the viewer route returns, then log in and refresh.
3. Log out again. From a viewer, select an interest and start a guest Bookmark. Choose Google sign-in. After returning, check the same viewer and interest, the completed bookmark, and that a refresh keeps the session. Confirm that canceling authentication on a separate guest action leaves it uncommitted.
4. In Profile and interests, upload a JPEG, PNG or WebP smaller than 1 MB. Confirm the avatar appears at the far right and remains after a refresh. Change an interest and confirm it persists. Log out and confirm private account information disappears.
