# flukewheel architecture

The repository uses npm workspaces with the React application in `apps/web`, portable request and domain contracts in `packages/contracts`, browser journeys in `tests/e2e`, and future local Supabase assets in `supabase`.

The home route renders only the native discovery feed. The external website viewer is lazy-loaded and mounted only for catalogue-ID viewer routes. Public catalogue, discovery, authentication, engagement and submission access is isolated behind adapters in `apps/web/src/lib`.

The 31 October product decision supersedes earlier external-opening fallback language in `plan.docx`: every active catalogue route mounts its original URL directly in the viewer iframe. The viewer has no Open original website action or external-opening fallback. Compatibility status remains catalogue evidence and does not change the viewer route. If a third-party site blocks framing, the browser may show its own error or an empty frame; Flukewheel keeps the visitor in the viewer.
