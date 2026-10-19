# Store privacy — 1.2.0

2026-10-19. Capacitor application in prototype/. This is an implementation inventory for truthful store declarations, not proof that the consoles have been updated.

- Optional analytics consent v3: random installation ID, product interactions, learning/audio outcome and coarse timing, app/platform version. Android Play install referrer campaign labels, installation date and observation age. iOS source unsupported. Used for analytics only, no advertising or cross-company tracking. No answer text, recordings or community content sent to PostHog.
- Optional community: device-bound Supabase user ID (no hardware ID), nickname, native/learning language, optional bio, posts/comments/corrections, up to two photos per post, private messages, reports/blocks and timestamps. Used for app functionality, safety and account management; linked to community account. Public contributions are visible to members, messages to participants and authorized operators handling reports. No email/password signup.
- Apple categories to review: User ID, Device ID (analytics install ID), Product Interaction, Photos or Videos (photos only), Emails or Text Messages (private messages), Other User Content (posts/comments/profile). Community categories linked to user; analytics follows existing installation-ID linked disclosure. No tracking.
- Google categories to review: User IDs, App interactions, Photos, Other in-app messages, Other user-generated content. Encrypted in transit; optional community and optional analytics. User-directed public posting is disclosed in policy; apply Play's user-initiated sharing exception only to the actual user-directed transmissions. No sale or advertising use.
- iOS speech recognition requires on-device recognition; no recorded voice or transcript upload/storage by Seodang.
- Video lessons embed official YouTube players; disclose third-party playback processing in public policy. No local video download or rehosting. YouTube may display provider ads; declare ads present where the store asks about embedded ads, despite no Seodang-owned ad SDK.
- Community account deletion is available at settings → profile edit → delete account. Public deletion request route: privacy policy contact. Learning progress remains on device. Deleted photos retry server-side every 15 minutes; unpublished photos enter cleanup after 24 hours.
- Analytics withdrawal stops new collection and clears local ID/queue. Already sent records can be deleted by contacting support with the analytics installation ID. Do not claim the 1-year PostHog query window is automatic deletion.

Public policy and deletion instructions: https://mi-hye.github.io/seodang/privacy-policy.html
Support and deletion requests: satge13@gmail.com

Update content/age questionnaires to reflect community posts, photos, accepted 1:1 messages, reporting and blocking. Do not reuse the former no-account/no-UGC answers.
