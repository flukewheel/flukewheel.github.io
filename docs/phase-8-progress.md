# Phase 8 testing and hardening progress

Phase 8 is in progress. This phase covers the complete MVP, including access boundaries, abuse controls, accessibility, performance and privacy. The completion check in `plan.docx` requires critical journeys to pass, no high-impact access issue to remain, a fresh database reset to succeed and errors to let visitors continue.

## Completed in this first pass

- Inventoried the existing Vitest, React Testing Library, Playwright and SQL checks. Phase 7 ended with a clean migration reset, 62 passing browser journeys and published signed-in checks. Phase 8 still needs its own full rerun after hardening changes.
- Added `tests/integration/phase8-access-boundaries.mjs`. It creates disposable users A/B and an administrator in the local Supabase stack, then calls REST/RPC as those users and a guest. It checks pending catalogue visibility, profile/bookmark/history isolation, cross-account writes, owner reassignment, private role access, trusted administrator RPC access and guest/member recommendations. The check passed, and all test accounts and the pending website were removed.
- Added `scripts/check-public-bundle.mjs` and a predeploy Pages workflow step. The current built text assets passed; a synthetic Supabase secret key was rejected. The check reports file and credential type without printing the credential.

## Next work against the plan

- **8.1 Boundaries and journeys:** Expand focused component tests for modal focus, pending actions and retry states; exercise storage through the direct API; cover submission-to-approval and restored-session browser journeys. Rerun the full suite and a fresh reset after changes.
- **8.2 Security and abuse:** Add server-side limits for Bump and recommendations, with trusted guest identity handling and member quotas. Review redirects, DNS rebinding, response limits, upload validation, logs, secrets in history, and a Pages-compatible CSP. Submission intake already has daily member/global limits and website reports have an hourly throttle. Outbound destination validation remains manual until network pinning can be enforced.
- **8.3 Accessibility, performance and privacy:** Review keyboard and modal behaviour, focus, contrast, reduced motion, zoom and narrow screens. Measure LCP/CLS on a documented mobile profile and discovery p95 separately from external sites. Document data retention, recommendation use and external-site cookies, then review UK privacy and cookie obligations.

Phase 8 is not ready for completion sign-off.
