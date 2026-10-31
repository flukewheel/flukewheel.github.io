# Phase 3 authentication and profile development

The web app provides email registration and sign-in, password recovery, Google sign-in, persistent sessions, and profile and interest editing. New accounts with no username see a short completion step; a duplicate username produces a correction prompt. Guests can still browse and Bump. A guest Love, Dislike or Bookmark is tied to the original website ID and resumes once after sign-in; closing authentication cancels it.

On 31 October 2026 the project owner removed profile pictures from the product requirements. The avatar upload control, signed avatar reads, and avatar display are no longer part of the app or the Phase 3 completion criteria. The previously deployed `process-avatar` backend and database fields remain for now but are unused by the frontend.

The bookmark icon is active only while an available discovery is open in the viewer. Signed-in bookmarks appear under the account menu's **Bookmarks** route, where they can be reopened or removed. If a saved catalogue entry becomes unavailable, the collection keeps a removable unavailable item. The list loads in pages of 20.

Signed-in users with an email address can request a password-reset link from **Profile and interests → Account security**. Guests can use **Log in → Forgot password?**. The email link returns to the route where the request began and opens the new-password form.

## Run locally

1. Start Docker Desktop, then run `npx supabase start` and `npm run dev` from the repository root. The app uses `http://127.0.0.1:5173/` and the local API uses port 54421.
2. Local email messages appear in Mailpit at `http://127.0.0.1:54424/`. The local config currently signs up users without email confirmation; confirmation must be checked separately on the hosted development project.

## Hosted development setup

- The frontend is published at `https://flukewheel.github.io/`. The hosted Supabase Auth Site URL is set to that exact address, with `http://127.0.0.1:5175/` as an additional redirect for localhost checks. These values are tracked in `[remotes.hosted.auth]` in `supabase/config.toml`.
- The Google OAuth Web client has `https://llzbpurpmcuiqcmserrd.supabase.co/auth/v1/callback` as its authorized redirect URI and `https://flukewheel.github.io` as an authorized JavaScript origin.
- Google is enabled in the hosted `flukewheel-dev` Supabase project. The public client ID and an environment-variable secret reference are recorded in `[remotes.hosted.auth.external.google]`; the secret itself remains outside the repository.
- Use the app entry URL for OAuth and email callbacks, since a physical `/auth/callback` path is not available on static hosting.
- The project owner completed a real Google sign-in and confirmed that the browser returned to the site signed in. The read-only hosted config comparison found no drift. A credential-free browser check on the deployed site confirmed that a guest Bookmark remains bound to its website, the Google handoff uses the published return URL, the viewer return route is saved, and callback errors restore the viewer and clean the URL without JavaScript errors. Later hosted checks uncovered email confirmation and recovery return issues, which were repaired. On 31 October 2026 the project owner confirmed that hosted email confirmation, password recovery, and Google sign-in with a pending viewer action now pass. The owner also confirmed an interest persisted after logout and login. OAuth PKCE links need the originating browser's verifier; a missing verifier produces a retry message.

## Checks

Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` and `npm run test:e2e`. The Phase 3 browser journeys exercise local signup, username completion and collision, profile and interest changes, logout, cancellation, a guest bookmark resumed on its original website, password recovery back to a viewer, and callback error restoration of a viewer and interest.

## Hosted completion checks

The account owner completed the first three checks on 31 October 2026 and confirmed interest persistence from the fourth. Do not put passwords, login codes or OAuth secrets in the repository or chat.

1. On the live site, begin email registration from a viewer route using a new address you can read. Open its confirmation link in the same browser. Check that the viewer returns, the username step appears, and the chosen username survives a refresh. If the link was opened in a different browser context, use the retry or sign-in path.
2. Log out, start password recovery from a viewer route, and open the email link in the same browser. Set a new password, verify the viewer route returns, then log in and refresh.
3. Log out again. From a viewer, select an interest and start a guest Bookmark. Choose Google sign-in. After returning, check the same viewer and interest, the completed bookmark, and that a refresh keeps the session. Confirm that canceling authentication on a separate guest action leaves it uncommitted.
4. In Profile and interests, change an interest. Confirm it persists after logout and login. The project owner confirmed this on 31 October 2026. Check that private account information disappears while logged out.
