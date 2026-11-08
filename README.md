# flukewheel

flukewheel is a website discovery application built around deliberate browsing and the serendipitous **Bump!** action.

## Requirements

- Node.js 22.17.0
- npm 11.9.0
- Docker Desktop for the local Supabase stack

The exact runtime is recorded in `.nvmrc`; application dependencies are pinned in `package-lock.json`.

## Start development

```sh
npm ci
npx supabase start
npm run dev
```

The web application lives in `apps/web`. It uses hash-based routes so navigation remains compatible with static GitHub Pages hosting.

## Published site

The site is built from this monorepo by `.github/workflows/pages.yml` and published at https://flukewheel.github.io/. GitHub Pages must use **GitHub Actions** as its build source. The workflow reads the hosted Supabase URL and publishable key from the repository's `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` Actions variables. Local development still uses `apps/web/.env.local`.

## Environment

Copy `apps/web/.env.example` to `apps/web/.env.local`. Use the API URL and publishable key printed by `npx supabase status` for the local stack. The default local API port is 54421 because another project uses Supabase's standard ports on this machine. Never place a secret or service-role key in a `VITE_` variable.

The local database is built from `supabase/migrations` and `supabase/seed.sql`. Run `npx supabase db reset --local` to verify a clean rebuild. See [Supabase workspace](supabase/README.md) for database checks and hosted setup.

The separate hosted development backend and its current Auth setup are recorded in [Phase 2 hosted development](docs/phase-2-hosted-development.md).
Phase 3 authentication, profile setup and remaining hosted provider steps are recorded in [Phase 3 authentication](docs/phase-3-auth.md).
Phase 5 homepage and catalogue browsing progress is recorded in [Phase 5 discovery progress](docs/phase-5-progress.md).
Phase 7 engagement and collections completion is recorded in [Phase 7 completion](docs/phase-7-progress.md).
Phase 8 testing and hardening is tracked in [Phase 8 progress](docs/phase-8-progress.md).

## Quality checks

```sh
npm run lint
npm run typecheck
npm run test
npm run build
```

Browser journeys use Playwright through `npm run test:e2e` after its browser runtime has been installed.

## Repository map

- `apps/web/src/app` — shell, providers, routes and error boundary
- `apps/web/src/features` — product feature boundaries
- `apps/web/src/components` — shared interface components
- `apps/web/src/lib` — configuration, adapters and generated database types
- `packages/contracts` — portable domain contracts and runtime request validation
- `supabase` — backend assets, beginning with the Phase 1 Edge Function import smoke test
- `tests/e2e` — browser journeys
- `docs` — setup, architecture and release documentation
