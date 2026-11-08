# Phase 8 owner checks

The engineering and automated checks are recorded in [Phase 8 progress](phase-8-progress.md). The project owner confirmed that published Google sign-in succeeds in a private browser, **For you** appears, and the guest prompt returns after sign-out. The reload/session-restoration check has not yet been reported. The privacy and cookie decisions below remain open.

## Published Google sign-in

1. In a private browser window, open <https://flukewheel.github.io/> and choose **Log in → Sign in with Google**.
2. Complete sign-in with your own Google account. Confirm that you return to Flukewheel, the account menu appears, and **For you** shows recommendations. The owner has confirmed sign-in and **For you**.
3. Reload once to confirm the session restores. Sign out and confirm the guest prompt returns. The owner has confirmed sign-out. Report any error text or unexpected redirect. Do not send passwords, codes or session tokens.

The automated check verified that the published button reaches `accounts.google.com`. The owner then completed a real account sign-in.

## Privacy and cookie decisions

Use the [technical privacy review](phase-8-privacy-review.md) to decide and record:

- Controller name and contact route, purposes and lawful bases, processors/recipients and transfer details.
- Retention periods or criteria for accounts, guest suggestions, moderation and operational records.
- Whether embedded external sites may set non-essential cookies before a visitor makes an informed choice, based on a representative cookie audit, and the resulting consent/disclosure flow.
- The public privacy notice and any minors policy.

These are owner decisions because the repository cannot establish legal identity, business purpose or retention rationale. The current UI should not claim that all external sites are cookie-free; one sampled viewer produced no cookies in one Chromium context, but the catalogue contains many independently operated sites.
