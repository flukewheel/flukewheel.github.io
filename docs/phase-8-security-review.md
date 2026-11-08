# Phase 8 security and abuse review

## Verified boundaries

- Direct REST/RPC/Storage checks cover guest, two members and an administrator. They reject pending catalogue reads, cross-account profile and activity access, owner reassignment, browser-role calls to trusted administrator RPCs, private avatar reads by other accounts and browser-role Storage uploads. The same local integration check exercises guest suggestion through administrator approval and public catalogue visibility, then removes its fixtures.
- Bump and recommendation quotas are enforced inside their database RPCs, including direct API calls. Member buckets use the verified JWT user ID. The anonymous Bump bucket is global because no trustworthy platform IP contract has been established. A single abusive guest can exhaust that shared bucket for other guests; this remains an availability limitation.
- Submission intake has daily global, pooled guest and member limits. Reports have an hourly throttle. The scheduled catalogue recheck job queues at most 25 stale records per day, with at most three retries for failed records. Administrator actions require a verified account and a private role check.
- Bump, submission, account deletion and administrator JSON bodies are now byte-bounded while streaming. Avatar input is bounded, checked for JPEG/PNG/WebP signatures and dimensions, then re-encoded as WebP by the trusted processor before Storage. Text descriptions are schema-limited and rendered as React text; no application `dangerouslySetInnerHTML` use was found.

## Destination and iframe boundary

The URL normaliser accepts only HTTP(S) public-domain syntax and rejects IP literals, IPv6 literals, private/loopback forms, local suffixes, credentials and custom ports. Tests include decimal, hexadecimal and octal loopback notation. The intake function stores the URL for human review and does not fetch it. Consequently, DNS rebinding and redirect-to-private-network do not currently create a server-side fetch path. Approval requires an administrator's manual verification note. After approval, the selected URL loads in a sandboxed browser iframe; the browser handles later redirects and the external site can change its content. Continued catalogue review remains necessary.

## Published app and logs

The GitHub Pages production build now inserts a meta CSP with same-origin scripts, scoped Supabase connections and images, no object embedding, and HTTP(S) external frames. Inline styles remain allowed because the current React UI sets a few style properties. A headless production-preview check loaded home and Wheel discovery at desktop and mobile widths without CSP violations; a hosted-configuration preview also passed. A meta CSP cannot set `frame-ancestors` or report-only monitoring, as described by [MDN's CSP guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) and [`frame-ancestors` reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors). Those controls would require a host that can set response headers.

The public bundle scanner passed and rejects synthetic secret-key material. An audit of the added lines in 63 Git commits found no Supabase secret key, private-key marker, GitHub token, API key or service-role JWT pattern. This is a pattern audit, not proof that no credential has ever existed elsewhere. Edge Functions do not log request bodies or tokens in their source. The avatar conversion log was reduced to a constant message so decoder errors cannot echo input-derived text.

## Open engineering dependency

A per-guest salted quota identifier requires a platform-supplied, unspoofable source IP. [Supabase documents Edge rate limiting by verified user ID](https://supabase.com/docs/guides/functions/examples/rate-limiting) and records `cf-connecting-ip` in [gateway logs](https://supabase.com/docs/guides/observability/log-field-reference), but these references do not guarantee that a forwarded client-IP header reaching this function cannot be forged. Do not derive a security identity from `x-forwarded-for`, `cf-connecting-ip`, CORS, or a browser-generated ID until that boundary is established. The pooled guest cap remains the safe interim control, with its fairness limit stated above.
