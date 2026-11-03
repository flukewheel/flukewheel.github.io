# Phase 5 discovery progress

Phase 5 is implemented and verified in the local development stack as of 3 November 2026. The Phase 5 migration has been applied to hosted Supabase. The frontend is awaiting publication through GitHub Pages.

## Implemented locally

- The home page shows ten recent approved active websites, ordered by approval time and ID. A See all link opens a separate browse route with 24-card pages. Both the recent route and category routes query Supabase in bounded pages; errors offer retry without substitute catalogue data.
- Website cards show the stored or bundled thumbnail, title, description and categories. Images reserve a 16:9 area, load lazily, and show a neutral fallback when loading fails. Missing thumbnails retain the card's decorative background. The home page does not mount an iframe or fetch an original website.
- Active database categories appear on home and drive category browsing and the existing Bump interest filter. The interest selector and Clear category link return to all interests. Category pages explain empty and unavailable states.
- For you appears for guests, members and authentication loading. Guests see inline account actions. Members receive up to six daily-stable recommendations through the authenticated `recommend_website_ids` RPC, with interest preference, category diversity and an optional strict category filter. Accounts with no interests receive a varied cold start. Loading, empty and failure states are visible. Public catalogue queries and user-scoped recommendation queries have separate keys; sign-out removes private cached queries, and interest/activity changes invalidate recommendations.
- Home and browse routes preserve scroll context when returning from a website. Reduced-motion preference stops the automatic recent carousel.

## Verification

- Local migration `20261103002919_phase_5_recommendations.sql` applied. The transaction-rolled-back `supabase/tests/phase5_recommendations.sql` passed checks for anonymous denial, cold start diversity, strict category filtering, invalid limit rejection and interest preference.
- `npx supabase db push --linked --dry-run --skip-vault` showed only the Phase 5 migration pending. It was then applied to the linked hosted project. A hosted query confirmed that the RPC exists, uses invoker rights, denies anonymous execution and permits authenticated execution.
- Local Supabase security and performance advisors reported no warning-or-higher issues.
- The hosted security advisor still reports the previously known [leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). It reported no new Phase 5 warning.
- Lint, typecheck, unit tests, production build and all 40 desktop/mobile browser journeys passed. Phase 5 browser checks cover bounded recent pages, category browsing, guest prompt, member cold start, interest invalidation, logout cache behaviour, recommendation retry, and absence of a home viewer frame.
- Headless screenshots of desktop and mobile home and recent browse routes were inspected. This is local visual verification, not a published-origin acceptance check.

## Remaining rollout

1. Publish the frontend through the existing GitHub Pages workflow.
2. Check the published origin as a guest and signed-in member on desktop and mobile, including thumbnail loading, category browsing, Bump interest context and For you recommendations. Confirm no home iframe or original-site request and check Supabase errors.

The 31 October owner decision remains in force: active catalogue sites open directly in the Flukewheel viewer iframe, even where a site blocks framing. Phase 5 does not reintroduce an external-opening fallback.
