# Phase 2 database review

The migration creates the public catalogue, profile and user activity tables plus `private.user_roles`, `private.moderation_events`, and `private.validation_jobs`. User-owned rows cascade on account deletion; catalogue foreign keys restrict deletion so deactivation preserves bookmarks and history. Pending submissions remain separate from approved websites. All public and private application tables have RLS enabled and explicit grants.

`npx supabase db reset --local` completed successfully on 24 October 2026. The local seed has four categories, eight approved sites, and sixteen site/category links. Generated public database types compile with the web app. Both Supabase local security and performance advisors returned no issues. The SQL security test passed guest visibility, owner isolation, ownership reassignment denial, role escalation denial, pending/rejected content denial, and private admin access checks.

Representative `EXPLAIN (ANALYZE, BUFFERS)` results on the small seed:

| Query | Observed plan | Execution |
| --- | --- | --- |
| Approved website keyset page | `websites_public_recent_idx` index scan, 8 rows | 0.122 ms |
| Category membership | `website_categories_category_website_idx` bitmap index scan, 3 rows | 0.094 ms |
| Owner bookmark keyset page | `bookmarks_user_recent_idx` bitmap index scan; no visible rows in context | 0.107 ms |

These measurements confirm index use on the local fixture, not production scale performance. Re-measure after real traffic and larger data exist.
