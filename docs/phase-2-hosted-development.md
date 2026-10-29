# Flukewheel hosted development backend

The separate `flukewheel-dev` Supabase project is in the `subanglo.tv` organization, London (`eu-west-2`) region. Its project reference is `llzbpurpmcuiqcmserrd` and its API URL is `https://llzbpurpmcuiqcmserrd.supabase.co`. Keep this project separate from the existing Subanglo projects and from any later production project.

The hosted database has the same two migrations as `supabase/migrations`, using versions `20261029162651` and `20261029162659`. They create the twelve RLS-protected application tables and the two media buckets. `import-smoke` and `process-avatar` are deployed. The former was invoked successfully on the hosted origin; the latter rejects unauthenticated calls. The full authenticated image-processing path was checked in the local Edge runtime with a real PNG, an invalid payload and an oversized payload.

`apps/web/.env.hosted.local` is an ignored local reference containing only the hosted API URL and publishable key. Keep `apps/web/.env.local` pointed at the local stack for ordinary development. Never put a secret key in a `VITE_` variable.

The hosted project intentionally has no local seed data. `supabase/seed.sql` is for local development only; hosted catalogue entries should arrive through the moderation workflow. The hosted email provider is enabled. Google OAuth is not yet enabled, so a real Google login check awaits the Phase 3 OAuth client and a hosted frontend callback origin. Its Google redirect URI will be `https://llzbpurpmcuiqcmserrd.supabase.co/auth/v1/callback`.

The Supabase connector deployed and verified the hosted resources. The local Supabase CLI has no personal access token in this environment, so it cannot run `supabase link` yet. After a developer signs into the CLI, link only this project with `npx supabase link --project-ref llzbpurpmcuiqcmserrd` and check `npx supabase migration list` before any future `db push`. Do not commit a personal access token.

Set `AVATAR_ALLOWED_ORIGINS` to exact frontend origins before adding a browser avatar upload UI. The hosted Edge runtime supplies current publishable and secret keys to `process-avatar`; the local runtime can use its legacy keys. Do not enable direct client avatar writes.
