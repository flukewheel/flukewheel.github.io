# Phase 4 submission and moderation status

Phase 4 is implemented locally and its database and Edge Functions are deployed to the hosted development project. The frontend is published separately through GitHub Pages. A final signed-in administrator walkthrough and manual compatibility review remain before the phase can be marked complete.

## Visitor suggestions

- The plus button accepts a URL, optional category suggestions and a description from guests or members. It returns a receipt for a pending submission; submission never publishes directly.
- The server accepts only public HTTP/HTTPS domain URLs without credentials or custom ports. It removes fragments and recognised tracking parameters for duplicate detection while preserving the submitted original URL. Local and IP destinations are rejected. No untrusted URL is fetched by the server.
- A transaction handles repeated request IDs, duplicate pending/catalogue URLs and a private validation job. Intake is capped at 100 suggestions per day overall, 40 guest suggestions per day overall, and five per member per day. The global guest cap protects the review queue but can be exhausted by one visitor; per-visitor abuse challenges remain future work if traffic warrants them.

## Administration

- Only a verified signed-in account in private `user_roles` can call the admin function. Browser roles cannot invoke the server-only SQL functions directly.
- The admin page lists pending suggestions with original URL, visitor note, category suggestions, validation status and exact duplicate evidence. Approval requires a title, description, active category, and a manual verification note. Approval, rejection, duplicate resolution, category links and audit events run in a transaction.
- Admin screens edit catalogue metadata, category assignments, active status, embedding status and taxonomy. Deactivation preserves bookmark and history references. The public viewer continues to show websites directly in its iframe without an external-opening control.
- Broken, inappropriate and low quality dislikes are grouped for review. A personal dislike does not automatically remove a site. Admins record review notes; users can submit at most one report signal per website per hour, enforced in the database.
- Supabase Cron queues up to 25 stale active catalogue entries each day at 03:00 UTC for manual recheck. Failed checks retry after seven days, up to three attempts. Recheck outcomes and notes are audited. Ordinary metadata edits do not renew the last-validated timestamp.

## Validation policy

The Edge runtime has not been shown to pin outbound requests to approved resolved destinations across redirects. Automated fetching of untrusted submissions is therefore disabled. Administrators inspect candidate pages in the hosted Flukewheel preview and record the result manually. iframe load alone is not treated as proof of usable content.

## Verification so far

- Five additive migrations applied locally and on hosted development. The hosted Cron job is active. Both Edge Functions are deployed with the intended JWT settings and exact Pages-origin CORS response.
- Local smoke checks cover pending intake, duplicates, private-address rejection, guest privacy, admin authority, approval retry, deactivation, categories, report review, report throttling and failed recheck recording.
- Hosted HTTP checks rejected an unsafe URL and an existing catalogue URL. One temporary hosted suggestion remained pending and returned the same receipt on retry; its validation job was present, then the test row was removed. An unauthenticated admin request was denied.
- Lint, typecheck, unit tests, production build and 34 desktop/mobile browser tests passed locally, including an admin-screen journey with mocked function responses. Local security advisors reported no warning-or-higher issues.

## Remaining checks

- Sign in on the live site with the configured administrator account and run one real suggestion through review. Confirm the new catalogue entry appears in home/Bump, then deactivate the test entry. Check category editing, reports and rechecks in the live admin page.
- Manually review the curated launch catalogue on the final hosted origin over time. Existing entries were imported earlier; stored `allowed` status is not proof that every page still renders usefully today. The four categories already exceed the plan's 15–25 entry content target by count.
- A challenge or stronger per-visitor guest throttling can be added if the global guest quota is repeatedly exhausted. No unverified automatic fetcher should be enabled to accelerate review.
