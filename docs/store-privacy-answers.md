## 2026-11-06 push notification release gate — not submitted to stores

- Before enabling `prototype/src/message-push-config.js`, publish the updated public policy and update both store consoles. Local policy files are prepared; the public URL and store declarations are not updated by these file edits. Installed builds and the server worker are not disabled by the local config flag.
- Optional message notifications: APNs/FCM registration token, random installation ID, community user ID, platform, notification locale and last refresh timestamp; linked to the community account. Purpose: app functionality/new-message delivery. No advertising or cross-app tracking.
- Apple: review **Identifiers → Device ID** for notification/installation identifiers, linked to user, app functionality (separate from analytics use). Google: review **Device or other IDs**, collected optionally, for app functionality. Assess provider processing under each console's service-provider definitions; do not label delivery as advertising sharing.
- Delivery uses Apple APNs / Google FCM. Payload contains generic notification text and room/message IDs, not message body or nickname. Server registration data is held by Supabase in Mumbai. Provider processing may include the US; see the policy's provider links.
- OS permission is requested on first eligible conversation entry; denied users get a settings hint once. In-app opt-out removes server registration; OS revocation is detected on a later app startup/resume. Offline failures may delay deletion.
- A token not refreshed for 90 days is excluded from new deliveries, not automatically deleted. Outbox entries older than 7 days are deleted on the next delivery-result processing call; this is not a guaranteed 7-day maximum. Account deletion cascades to token/outbox records.
- Numeric release version has not been changed or assumed: local app metadata is 1.2.5 while prior store work references later versions. Policy applicability is explicitly the build including message notifications. Set the actual release version/date in the release workflow.

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
