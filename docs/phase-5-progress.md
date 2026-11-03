# Phase 5 discovery progress

Phase 5 is implemented locally and published at https://flukewheel.github.io/ as of 3 November 2026. The Phase 5 migration is applied to the linked hosted Supabase project. The published signed-in interface still needs an owner-account walkthrough.

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
- GitHub Pages workflow [41557874757](https://github.com/flukewheel/flukewheel.github.io/actions/runs/41557874757) succeeded for commit `0d9faa4`. Headless checks on the published origin at desktop and mobile widths found ten recent cards, four categories, the guest For you prompt, 24-card recent and Art browse pages, no home iframe or external frame request, and no page errors. Guest Bump from Art opened a viewer and retained the Art interest at both widths. Screenshots were inspected.
- A read-only hosted SQL check under the authenticated role and a synthetic JWT subject returned six cold-start recommendation IDs. This verifies the hosted RPC path, but does not replace an interactive signed-in browser check.

## Remaining rollout

1. With a real signed-in account on the published origin, check For you cards, interest changes, and sign-out on desktop and mobile. This requires account credentials or the owner's own session, which were not used for the automated published-origin check.

The 31 October owner decision remains in force: active catalogue sites open directly in the Flukewheel viewer iframe, even where a site blocks framing. Phase 5 does not reintroduce an external-opening fallback.
