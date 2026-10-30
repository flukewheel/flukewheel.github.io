# Supabase workspace

The CLI is pinned at `2.122.0` in the root package. `config.toml` uses dedicated local ports (`54421` API, `54422` database, `54423` Studio). Docker Desktop must be running.

## Local workflow

```sh
npm ci
npx supabase start
npx supabase db reset --local
npx supabase gen types --local --schema public > apps/web/src/lib/database.types.ts
npx supabase db advisors --local --type security --level warn
npx supabase db advisors --local --type performance --level warn
npx supabase functions serve
```

Use `npx supabase status` for the local API URL and publishable key; place only those values in `apps/web/.env.local`. The seed file is local development data. Hosted `db push` applies migrations but does not load it. Schema changes belong in a reviewed migration generated with `npx supabase migration new <name>`, followed by a clean reset and regenerated types. Capture any Dashboard schema changes with `npx supabase db diff` before merging them.

Run `supabase/tests/phase2_security.sql` through `psql` against the local database. It creates guest, user A, user B, and administrator contexts inside a transaction and rolls back. On this machine:

```powershell
Get-Content -Raw -LiteralPath 'supabase\tests\phase2_security.sql' | docker exec -i supabase_db_flukewheel psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

To verify the avatar processor end to end, run `npx supabase functions serve process-avatar` in one terminal, then `python scripts/verify-avatar-local.py` in another. The check creates and removes a local test account and avatar, verifies a successful PNG-to-WebP upload and profile update, and checks that malformed image data is rejected.

The smoke Edge Function has its own pinned Deno dependency in `functions/import-smoke/deno.json`. Its handler has been exercised through the local Deno runtime.

## Hosted development project

Create a separate Flukewheel development project in the intended Supabase organization. Link only that project's reference (`npx supabase link --project-ref <ref>`), review the diff (`npx supabase db diff --linked`), then push migrations (`npx supabase db push --linked`). Record its URL and publishable key in an ignored local environment file. Do not commit access tokens or service-role keys. Do not link the existing Subanglo projects as a substitute.

## Media boundary

`thumbnails` is public and has no client upload policy. `avatars` is private and owner-readable. Clients cannot write to the avatar bucket or set `profiles.avatar_path` directly. The authenticated `process-avatar` Edge Function accepts a `file` multipart field, checks the actual JPEG/PNG/WebP signature and decoded format, caps input at 1 MB and dimensions at 4096 by 4096 (16 million pixels), auto-orients and reduces the image to at most 512 pixels on its longest side, then re-encodes WebP. It stores the result under the verified user's folder and updates their profile path. Set `AVATAR_ALLOWED_ORIGINS` to a comma-separated list of exact frontend origins before calling it from a browser. The function uses Supabase's injected publishable and secret keys, with local legacy-key fallback. Never expose a secret or service-role key in the frontend. Phase 3 can add the upload UI and private avatar display flow.
