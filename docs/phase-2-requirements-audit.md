# Phase 2 requirements audit

Checked against `plan.docx` on 29 October 2026. Phase 2 is not yet fully complete under the plan's literal wording.

| Plan item | Result | Evidence or remaining work |
| --- | --- | --- |
| 2.1 Reproducible local and hosted backend | Pass | CLI pinned; hosted project linked; both migration versions match; linked public/private/storage schema diff was empty. A fresh `npx supabase db reset --local --yes` exited zero on 29 October and seeded 87 records, including 82 active sites. The local SQL access checks passed after reset. |
| 2.2 Schema, indexes and development catalogue | Pass for schema and access checks | Core and private tables, constraints and indexes are migrated. The user-curated catalogue now has four categories, 82 active sites and five inactive records in both local and hosted development databases. Local SQL access tests pass. Third-party inline compatibility varies by site. |
| 2.3 Grants, RLS and administrator | Pass | Local guest/user A/user B/service-role checks pass and hosted RLS is enabled. The confirmed hosted Auth user `shaunschwegler@gmail.com` has the sole `private.user_roles` admin row, and a `grant_admin` audit event was verified. |
| 2.4 Typed API contracts and privilege boundaries | Pass for the design stage | Runtime request/response schemas now cover the six planned APIs; implementation of most endpoints belongs to later phases. The avatar function verifies Auth identity and derives its owner ID from the token. Hosted error responses include stable codes and an opaque request ID. |
| 2.5 Media and secrets | Security goal met; literal policy wording differs | The trusted function validates and re-encodes images; clients cannot write unprocessed avatars or set profile avatar paths. The plan calls for owner-path insert/select/update/delete policies on avatar objects, while the safer implemented boundary grants owner reads and reserves all writes for the trusted processor. The plan or implementation needs an explicit alignment decision. |

The hosted project now contains the same explicitly imported user-curated catalogue as local development. A clean local reset and access checks passed. The sole administrator has been bootstrapped. The remaining Phase 2 decision is explicit alignment of section 2.5 with the implemented trusted avatar processor. Google Auth is disabled; creating its OAuth client and running a real login belong to Phase 3, although section 2.1 names the hosted project as the place for those checks.
