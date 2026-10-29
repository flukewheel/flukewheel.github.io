# flukewheel architecture

The repository uses npm workspaces with the React application in `apps/web`, portable request and domain contracts in `packages/contracts`, browser journeys in `tests/e2e`, and future local Supabase assets in `supabase`.

The home route renders only the native discovery feed. The external website viewer is lazy-loaded and mounted only for catalogue-ID viewer routes. Public catalogue, discovery, authentication, engagement and submission access is isolated behind adapters in `apps/web/src/lib`.
