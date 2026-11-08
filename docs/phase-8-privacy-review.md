# Phase 8 technical privacy review

This is an implementation inventory for the project owner. It does not choose Flukewheel's legal basis, retention schedule or cookie consent policy.

## Data currently used

| Data | Purpose in the app | Current lifetime and controls |
| --- | --- | --- |
| Supabase Auth account, email and session | Sign-in, recovery and owner-scoped access | Session persists in browser storage until sign-out, expiry or deletion. Account deletion calls the server function and removes the Auth user. |
| Profile username and avatar | Account display | Profile is owner-scoped; the avatar is in a private Storage bucket. Account deletion removes avatar objects and the profile. |
| Interests, reactions, bookmarks and visit history | Personalisation and saved activity | Owner-scoped rows persist while the account exists. Members can clear history, export these collections and delete the account. Recommendation scoring uses interests, reactions, bookmarks and recent visits; there is no automated decision with legal or similarly significant effects identified in this code review. |
| Website suggestions and moderation records | Catalogue review and abuse handling | A guest suggestion has no account ID. A member suggestion is exportable and is deleted with the account. Guest suggestions and moderation events have no general timed purge in the current migrations. The owner must set retention periods or criteria. |
| Discovery quota counters | Limit costly requests | Member counters use verified Auth IDs; guest Bump calls share one counter. The daily cleanup removes counters older than two days. No guest IP is stored by this code. |
| Browser session state | Restore interest, recent discovery IDs, scroll position and pending sign-in action | Primarily `sessionStorage`, which is scoped to the tab session. A cross-tab Auth return route is placed in `localStorage` and ignored after one hour. Supabase Auth also persists its session in browser storage. |

The app does not load an analytics SDK or deliberately set a first-party tracking cookie in its source. Supabase Auth and any loaded external website may use their own browser storage or cookies; that requires a real browser cookie audit before a public statement about cookies is final.

In one headless guest sample on 8 November 2026, the published homepage and a recently added site's viewer produced no cookies visible to that Chromium context; the viewer did request `picturesofwalls.com`. This is a single-site sample under one browser configuration and cannot establish behavior for every catalogue site or browser.

## External websites

The homepage does not mount an external website. A viewer route mounts the selected site's original URL in a sandboxed iframe with forms, scripts and same-origin behavior allowed, and with a strict-origin-when-cross-origin referrer policy. The external site can receive the visitor's IP address and origin referrer and may set cookies or collect other data. Its behavior is outside the catalogue database and can change after approval. An embedded site's redirects are handled by the browser; Flukewheel does not fetch or follow them on the server.

The [ICO cookie guidance](https://ico.org.uk/media2/for-organisations/guide-to-pecr/guidance-on-the-use-of-cookies-and-similar-technologies-1-0.pdf) discusses embedded third-party content and the responsibility to inform visitors and obtain consent where required. A notice added after the iframe loads would not prevent prior storage access. The owner must decide the cookie audit and consent approach before this aspect can be signed off.

## Owner decisions needed before a final privacy notice

1. Controller name and contact method, lawful basis for each purpose, recipients/processors and any international transfer information.
2. Retention periods or criteria for accounts, guest suggestions, moderation and operational records, plus a deletion schedule where appropriate.
3. Cookie and similar-technology audit of Supabase Auth, Google sign-in and a representative set of embedded sites; then the applicable consent and disclosure flow.
4. The public contact route for privacy requests and any policy for minors.

The [ICO privacy information guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/) calls for the controller's identity, purposes, lawful basis, recipients, retention periods or criteria, and rights information. Its [storage limitation guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/) leaves the specific retention period to the organisation to justify. This review records the implementation facts so those decisions can be made without guessing.
