# Store privacy — 1.1.2

2026-10-16. Applies to the Capacitor application in prototype/.

Opt-in only, schema/consent v2. No login, ads, IAP, account identifiers, answer text, recordings, screen capture, location or advertising ID. HTTPS PostHog US processor. Random installation ID persists across sessions; do not describe as fully anonymous. No cross-app tracking.

Apple: Device ID, Product Interaction, Other Diagnostic Data; Analytics purpose. Conservatively mark linked to user/device because an installation identifier associates activity across sessions; not used for tracking. No crash logs are collected. Audio failure outcomes are Other Diagnostic Data.

Google: Device or other IDs, App interactions, Diagnostics. Collected optionally, not ephemeral, Analytics purpose, encrypted in transit. PostHog processes on behalf of the operator (service-provider exception to sharing). No account creation. Deletion requests available via privacy policy contact using installation ID, obtained before opt-out.

Public policy and deletion instructions: https://mi-hye.github.io/seodang/privacy-policy.html

PostHog free plan verified in billing UI. Its 1-year event query window is NOT automatic deletion. Policy explicitly states records may remain until deletion request/service end; do not promise a TTL that is not implemented.

References:
- https://developer.apple.com/app-store/app-privacy-details/
- https://support.google.com/googleplay/android-developer/answer/10787469
- https://posthog.com/docs/data/events-retention
- https://posthog.com/docs/privacy/data-storage#data-deletion
