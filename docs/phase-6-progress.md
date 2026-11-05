# Phase 6 Bump and viewer progress

Phase 6 implementation started on 5 November 2026. The new database migrations and Bump Edge Function are deployed to the linked hosted Supabase project. The frontend rollout and published-origin review are tracked separately below.

## Implemented

- Bump requests now send a category ID, at most 20 recent catalogue IDs and a retry-stable request ID to a server endpoint. Guests remain able to Bump. The browser no longer downloads the full catalogue to choose a site.
- The invoker-rights PostgreSQL selector uses an indexed random key and bounded candidate sampling. It requires approved, active, embedding-allowed entries and enforces the selected category. It excludes the current site and recent session/account discoveries, relaxes older exclusions in stages when needed and reports relaxation. It blocks the Flukewheel origin. Entries with other embedding states remain available through cards according to the owner's viewer-only decision but cannot be selected automatically by Bump.
- Signed-in selections are recorded once per `(user_id, request_id)` in `bump_history`. A retry returns the stored website, selection ID and relaxation flag. Guest recency remains in bounded session storage.
- Interest choices, reaction reasons, bookmarks and recency influence bounded category affinity; 25% of selection requests use uniform exploration within the eligible pool. The For you RPC now shares the eligibility boundary and considers these signals while retaining daily-stable, category-diverse results.
- Bump stays busy during selection and keeps the current view until the result arrives. A later route or interest change prevents a pending result from navigating. Empty categories show a specific message and small-pool repeats show a notice.
- The viewer shows title, domain, opening feedback and a delayed trouble hint. Copy Link copies `original_url`. The iframe keeps its existing explicit sandbox and referrer policy, and the app's own origin is rejected as an external discovery.

## Verification

- A clean local reset applied every migration and seed. Rollback-only SQL tests cover guest eligibility, strict categories, empty and one-site pools, own-origin exclusion and repeat notice; the prior recommendation contract test still passes.
- An isolated local account test created and removed a test user, verified one history row for two identical requests and rejected an unknown category. The local guest function also returned an eligible inline site.
- Lint, typecheck, unit tests and production build passed. The initial 42 desktop/mobile browser tests passed, as did four new checks for original-URL copying and delayed-selection navigation at both widths. The final 46-test run passed 45 tests; one existing mobile reaction test timed out while waiting for an icon after a reason change, then passed when rerun alone. That intermittent interaction remains under observation.
- A representative local selector call took about 25 ms in PostgreSQL; 100 calls returned 84 distinct websites. Local security and performance advisors reported no issues.
- Hosted migrations and the Edge Function deployed. A hosted guest request returned an approved, active, embedding-allowed site. Hosted advisors reported only the previously known leaked-password-protection warning.

## Owner decision and remaining checks

The owner's 31 October viewer-only decision supersedes the plan's external-opening controls: active cards still attempt an inline iframe even when embedding is blocked. Bump selection remains limited to entries marked allowed. The 140 newest sites with unknown embedding status stay browsable but are excluded from automatic Bump and For you selection until checked.

The frontend must be published and checked on the actual Pages origin before Phase 6 is marked complete. Controlled slow, redirected and unavailable viewer cases, plus representative real-site viewing, still need published-origin review.
