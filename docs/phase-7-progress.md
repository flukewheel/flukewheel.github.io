# Phase 7 engagement and collections progress

Phase 7 is implemented locally and remains in progress until the hosted rollout and live checks. None of its migrations or new frontend/function code has been deployed.

## Implemented

- Love now toggles off when selected again. Love, Dislike and Bookmark update the current website's cached state immediately; a failed write restores the previous state and shows an error. Each mutation remains tied to the original website and account.
- The private browsing-history route now lists signed-in Wheel selections newest first, with timestamp and ID cursor pagination. Repeated selections remain separate entries. A removed or unavailable catalogue item can still appear as an unavailable entry.
- Members can clear their own `bump_history` rows. The new migration grants DELETE only to `authenticated` and adds an owner-only RLS policy. The page confirms before clearing and invalidates history and recommendations afterward.
- The browser interaction journey now checks that Love turns off and back on. A transaction-rolled-back SQL test checks owner reads/deletes, cross-account isolation and guest denial.
- A browser journey checks signed-in Wheel history, reopening a discovery, clearing history and persistence after refresh at desktop and mobile widths.
- Card, bookmark and history links now record separate, labelled member visits. The browser sends a retry-stable request ID stored in route state. Bump remains recorded by its trusted server endpoint. A new owner-only insert policy accepts only active approved sites and the three deliberate-visit sources; it rejects cross-account inserts, inactive sites, guest writes and client-forged Bump records.
- Bookmarks now use timestamp/website-ID cursor pagination instead of offset pages.
- Profile settings export bounded owner-scoped profile, interests, reactions, bookmarks, history and suggestions to JSON. Exports fail without producing a partial file if any collection exceeds 10,000 records.
- The account deletion action verifies the member's current Auth token and typed email in a server function. It refuses administrator accounts until their role is transferred, removes legacy avatar objects via Storage, and deletes the Auth user. A database trigger removes the member's suggestions and associated review events in the same transaction; FK cascades remove the member's profile, interests, reactions, bookmarks and history. Approved catalogue websites remain public.
- Deletion removes refresh sessions with the Auth user. An already issued stateless access token may remain valid until expiry; affected personal rows are removed, and the function verifies the Auth user on each sensitive request. The UI explains this limit.

## Verification

- Typecheck, lint, unit tests and production build pass.
- After Docker Desktop started, the Phase 7 migration applied to the existing local database without resetting it. The rollback-only SQL security test passed.
- The focused member interaction journey passed at desktop and mobile widths, including Love removal and reapplication. The new history journey passed at both widths.
- The member-visit and account-deletion migrations applied locally. Rollback-only SQL tests passed for visit-source/owner restrictions and deletion cascades while preserving another account's data.
- The browser journey passed at both widths for all four history sources, export content, clearing history, account deletion and failed login after deletion. A deliberate write-failure test found and fixed a rollback race during initial member-state loading; it now passes at both widths.
- The final full browser suite passed 62/62 tests at desktop and mobile widths. Lint, typecheck, unit tests and production build pass. Local security and performance advisors reported no warning-level issues.
- An isolated local smoke test created a disposable Auth user and avatar object, then verified that account deletion removed both. A second disposable administrator account was refused and remained intact. The test cleaned up its fixtures.
- A delayed Love followed by a new Wheel discovery kept the reaction on the original website, at desktop and mobile widths. Existing rollback-only Phase 5 recommendation and Phase 6 Bump selection SQL regressions passed after the Phase 7 history changes.

## Remaining Phase 7 work

- Verify a clean migration reset in an isolated local database. The current local database was preserved rather than reset.
- Check activity-driven personalisation with signed-in data on the published origin. Existing local Phase 5/6 checks cover recommendation invalidation and scoring, and the rapid-navigation member check covers reaction identity.
- Deploy the three migrations, `delete-account` function and frontend; then check signed-in history, export and deletion on the published origin before marking Phase 7 complete.
