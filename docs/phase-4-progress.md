# Phase 4 submission and moderation checkpoint

The Phase 4 workflow is implemented and tested locally but has not been deployed to the hosted Supabase project or GitHub Pages. The live site still shows the prior submission placeholder until a reviewed deployment.

## Implemented

- The plus button opens a guest-friendly suggestion form with a URL, optional categories and description, a pending receipt, and useful errors.
- `submit-website` validates and normalises public HTTP/HTTPS URLs, rejects local/IP/custom-port/credential URLs, removes known tracking parameters and fragments, and calls a server-only transactional intake function. Intake handles request retries, pending/catalogue duplicates, member and global guest quotas, and creates a private validation job. Suggestions do not publish themselves.
- The admin route checks the authenticated user against private `user_roles` in the backend. It lists pending suggestions, previews them in an iframe for manual review, and approves or rejects them through a transaction with category links and an audit event. Only a manually verified page can be approved from the UI. Existing URL races resolve to the existing catalogue row.
- Admin catalogue and category screens can edit titles, descriptions, thumbnail paths, assignments, active state, embedding status, category names/slugs and display order. They retain audit events. Deactivation keeps existing bookmark and history references.
- The public viewer still loads sites directly in its iframe and offers no external-opening action.

## Validation approach

No automatic request is made to an untrusted submitted URL. The current Edge runtime has not been shown to support binding each request to an approved resolved destination across redirects. Until that control is demonstrated, validation and compatibility checks are manual in the admin preview. This avoids adding an unrestricted server-side fetcher. The submitted site remains private and pending until review.

## Local verification

- Three migrations applied locally. Generated public database types compile.
- Local smoke checks covered guest intake, duplicate and private-address rejection, denied ordinary-user administration, denied direct browser calls to the server-only role function, administrator approval and retry, public visibility, deactivation, and category creation.
- Security advisors reported no warning-or-higher issues. Lint, typecheck, unit tests, build and all 32 desktop/mobile browser tests passed.

## Remaining Phase 4 work

- Deploy reviewed migrations before the Edge Functions and frontend, then test the hosted origin with a controlled administrator session. The local smoke script deliberately creates test records; do not run it against hosted data.
- Add the longer-term validation/recheck process and report review workflow, with safe network controls or continued manual handling. Curate and manually recheck launch content on the actual hosted origin.
- Verify the full admin screens and public-catalogue updates end to end on hosted development before calling Phase 4 complete.
