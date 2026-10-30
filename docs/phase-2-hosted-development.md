# Flukewheel hosted development backend

The separate `flukewheel-dev` Supabase project is in the `subanglo.tv` organization, London (`eu-west-2`) region. Its project reference is `llzbpurpmcuiqcmserrd` and its API URL is `https://llzbpurpmcuiqcmserrd.supabase.co`. Keep this project separate from the existing Subanglo projects and from any later production project.

The hosted database has the same two migrations as `supabase/migrations`, using versions `20261029162651` and `20261029162659`. They create the twelve RLS-protected application tables and the two media buckets. `import-smoke` and `process-avatar` are deployed. The former was invoked successfully on the hosted origin; the latter rejects unauthenticated calls. The full authenticated image-processing path was checked in the local Edge runtime with a real PNG, an invalid payload and an oversized payload.

`apps/web/.env.hosted.local` is an ignored local reference containing only the hosted API URL and publishable key. Keep `apps/web/.env.local` pointed at the local stack for ordinary development. Never put a secret key in a `VITE_` variable.

The hosted project contains the explicitly imported user-curated catalogue from `supabase/seed.sql` and `supabase/catalogue`. The October 30 batch added 56 rows, bringing the total to 172 approved records and 157 active records. Six entries use the external-open viewer fallback on GitHub Pages. `db push` does not apply `supabase/seed.sql` automatically. The hosted email and Google providers are enabled. A real Google login from https://flukewheel.github.io/ was confirmed by the project owner. Google's authorized redirect URI is `https://llzbpurpmcuiqcmserrd.supabase.co/auth/v1/callback`.

The confirmed Auth user `shaunschwegler@gmail.com` is the sole administrator in `private.user_roles`; the `grant_admin` audit event was verified. The first invitation used the Supabase default Site URL of `http://localhost:3000`, so its browser redirect reached an empty port even though email confirmation succeeded. The hosted Auth Site URL now points to `https://flukewheel.github.io/`, with `http://127.0.0.1:5175/` allowed for hosted-backend checks from localhost. To serve the frontend against the hosted backend locally, run `npx vite --host 127.0.0.1 --port 5175 --mode hosted` from `apps/web`. The regular local-backend frontend uses port 5173. Account UI and callback handling are implemented in Phase 3; remaining hosted checks are listed in `docs/phase-3-auth.md`.

The Supabase connector deployed and verified the hosted resources. The local Supabase CLI is linked to this project. `npx supabase migration list --linked` confirmed that both local and remote versions match: `20261029162651` and `20261029162659`. `npx supabase db diff --linked --schema public,private,storage` found no schema changes. Recheck migration differences before any future `db push`. Do not commit a personal access token.

`AVATAR_ALLOWED_ORIGINS` now includes the published origin and hosted-backend localhost origin. The hosted Edge runtime supplies current publishable and secret keys to `process-avatar`; the local runtime can use its legacy keys. Do not enable direct client avatar writes.

The approved Phase 2 media requirement grants owners read access to their avatar paths and reserves writes for the trusted processor. Section 2.5 of `plan.docx` was clarified to match this boundary.
