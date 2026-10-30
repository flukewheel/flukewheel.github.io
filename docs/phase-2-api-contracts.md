# Phase 2 API contracts and privilege boundaries

Runtime schemas live in `packages/contracts/src/index.ts`. Requests are size bounded and include an opaque UUID `request_id`; failures use `{ code, message, request_id }`. Supported codes are `INVALID_INPUT`, `AUTH_REQUIRED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `EMPTY_CATALOGUE`, and `INTERNAL_ERROR`. Public website DTOs expose only title, description, original URL, thumbnail URL, category IDs, and delivery mode.

| Endpoint | Caller | Request | Response | Database authority |
| --- | --- | --- | --- | --- |
| `bump` | Guest or user | Optional category, up to 20 recent IDs, request ID | One website, selection ID, exclusion flag | Public catalogue read; server records history only for authenticated users |
| `recommendations` | Guest or user | Optional category, limit 1–20, opaque cursor, request ID | Up to 20 websites and next cursor | Public catalogue read |
| `submit-website` | Guest or user | URL, up to eight suggested slugs, optional description, request ID | Pending submission ID | Protected function validates and rate limits; no direct guest table insert |
| `validate-website` | Trusted worker | Submission ID, request ID | Submission ID, validation job ID and bounded status | Elevated access to private validation jobs |
| `moderate-submission` | Administrator | Decision and bounded decision fields | Submission ID, final status and optional resolved website ID | Verify JWT, look up `private.user_roles`, then elevated write and audit event |
| `delete-account` | Authenticated owner | Literal `DELETE`, request ID | Deletion receipt with `deleted: true` | Verify JWT and derive account ID from token |

These are contracts for future functions, not deployed endpoints. Frontend `Bump!` currently selects from the real public catalogue locally. Function implementations must reject unknown fields, verify caller identity from JWT rather than request body or user metadata, and check administrator authority in `private.user_roles` before any service-role write. Only the project URL and publishable key are allowed in the frontend. CORS is an origin check, not caller authentication or rate limiting.

The migration grants ordinary clients only the needed public reads and owner-scoped writes. History and submissions are read-only to authenticated clients; private moderation, validation, and role tables have no anon/authenticated grants. Server code using an elevated client bypasses RLS and must enforce identity and ownership itself. Keyset cursors use timestamp plus UUID to break ties.
