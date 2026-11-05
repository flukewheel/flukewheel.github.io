# Phase 6 Bump and viewer progress

Phase 6 implementation started on 5 November 2026. The database migrations, Bump Edge Function and frontend are deployed. Published guest discovery and viewer checks have passed. A real signed-in Bump on the published origin is still unverified, so Phase 6 is not yet marked complete.

## Implemented

- Bump requests now send a category ID, at most 20 recent catalogue IDs and a retry-stable request ID to a server endpoint. Guests remain able to Bump. The browser no longer downloads the full catalogue to choose a site.
- The invoker-rights PostgreSQL selector uses an indexed random key and bounded candidate sampling. It requires approved, active, embedding-allowed entries and enforces the selected category. It excludes the current site and recent session/account discoveries, relaxes older exclusions in stages when needed and reports relaxation. It blocks the Flukewheel origin. Entries with other embedding states remain available through cards according to the owner's viewer-only decision but cannot be selected automatically by Bump.
- Signed-in selections are recorded once per `(user_id, request_id)` in `bump_history`. A retry returns the stored website, selection ID and relaxation flag. Guest recency remains in bounded session storage.
- Interest choices, reaction reasons, bookmarks and recency influence bounded category affinity; 25% of selection requests use uniform exploration within the eligible pool. The For you RPC now shares the eligibility boundary and considers these signals while retaining daily-stable, category-diverse results.
- Bump stays busy during selection and keeps the current view until the result arrives. A later route or interest change prevents a pending result from navigating. Empty categories show a specific message and small-pool repeats show a notice.
- The viewer shows title, domain, opening feedback and a compact trouble control after a delay. Help text appears only when requested. Copy Link copies `original_url`. The iframe keeps its existing explicit sandbox and referrer policy, and the app's own origin is rejected as an external discovery. Forms, scripts and same-origin behavior are permitted inside the sandbox; top-level navigation, popups and device permissions are not granted.

## Verification

- A clean local reset applied every migration and seed. Rollback-only SQL tests cover guest eligibility, strict categories, empty and one-site pools, own-origin exclusion and repeat notice; the prior recommendation contract test still passes.
- An isolated local account test created and removed a test user, verified one history row for two identical requests and rejected an unknown category. The local guest function also returned an eligible inline site.
- Lint, typecheck, unit tests and production build passed. The initial 42 desktop/mobile browser tests passed. Ten Phase 6 browser checks now pass for original-URL copying, delayed-selection navigation, compact viewer help, slow pages and in-frame redirects at both widths. A 46-test run passed 45 tests; one existing mobile reaction test timed out while waiting for an icon after a reason change, then passed when rerun alone. That intermittent interaction remains under observation.
- A representative local selector call took about 25 ms in PostgreSQL; 100 calls returned 84 distinct websites. Local security and performance advisors reported no issues.
- Hosted migrations and the Edge Function deployed. A hosted guest request returned an approved, active, embedding-allowed site. GitHub Pages workflow 42072861556 published the frontend. Headless checks on the published origin showed guest Bump reaching a viewer at desktop and mobile widths, no iframe on home and no page errors. Screenshots of WorldGuessr and The Physics Hypertextbook showed both real sites rendering inside their iframes. The screenshots also exposed a large delayed trouble message on working pages; it was changed to a compact, user-opened control and verified locally. Hosted advisors reported only the previously known leaked-password-protection warning.

## Owner decision and remaining checks

The owner's 31 October viewer-only decision supersedes the plan's external-opening controls: active cards still attempt an inline iframe even when embedding is blocked. Bump selection remains limited to entries marked allowed. The 140 newest sites with unknown embedding status stay browsable but are excluded from automatic Bump and For you selection until checked.

The compact viewer-help correction must be published and checked on the actual Pages origin. A real signed-in Bump and recommendation transition on that origin remains the final account-level check. Local tests cover slow, redirected and unavailable viewer states; representative real sites were visually checked on the published origin.
