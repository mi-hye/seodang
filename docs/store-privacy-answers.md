# Store Privacy Answers Draft

Last updated: 2026-06-08

This draft helps fill App Store Connect App Privacy and Google Play Data safety
forms. Re-check this file before submission if analytics, crash reporting,
accounts, ads, payments, or any new SDK is added.

## Current App Behavior Assumption

- No user account or login
- No ads
- No analytics SDK
- No crash reporting SDK
- No payment or subscription
- No server upload of individual practice history
- Local storage for settings, favorites, progress, reminders, and onboarding
- Supabase requests for public kanji content
- Local notifications for study reminders

## Apple App Privacy Draft

Privacy Policy URL:

- Required. Use the hosted version of `docs/privacy-policy.html`.

Data Collection:

- Recommended answer for the current release: `Data Not Collected`

Reasoning:

- App language, theme, onboarding state, favorites, progress, and reminder
  settings are stored locally on the user's device.
- The app fetches public learning content from Supabase.
- The app does not require login and does not upload user practice history.
- The app does not use tracking, ads, analytics, or crash reporting SDKs.

Important review note:

- If Supabase logs IP address or request metadata as part of infrastructure
  operation, confirm whether this needs disclosure for the final release. The
  app itself does not currently use that data to identify users, track users, or
  build user profiles.

Tracking:

- Does this app use data for tracking purposes? `No`

Data linked to the user:

- Current draft: `No`

Data not linked to the user:

- Current draft: `No app-declared user data`

## Google Play Data Safety Draft

Does your app collect or share any required user data types?

- Current draft: `No`

Does your app share user data with third parties?

- Current draft: `No`

Security practices:

- Data is encrypted in transit: `Yes`
- Users can request data deletion: likely `Not applicable` for account data,
  because the current app does not create accounts or store user data on an app
  server.
- User data collection is optional: `Not applicable`, based on the current
  draft of no declared user data collection.

Notes:

- Supabase content requests happen over HTTPS.
- Local app data can be removed by clearing app storage or uninstalling the app.
- Notification permission is requested only when study reminders are used.

## If Features Change

Update this document and store forms if the app adds:

- Login or user profiles
- Cloud-synced practice history
- Analytics
- Crash reporting
- Ads
- In-app purchases
- User-generated content
- Contact forms or support chat
- Any SDK that collects device identifiers or diagnostics

## References

- Apple App Privacy:
  https://developer.apple.com/help/app-store-connect/reference/app-privacy/
- Apple App Privacy Details:
  https://developer.apple.com/app-store/app-privacy-details/
- Google Play Data safety:
  https://support.google.com/googleplay/android-developer/answer/10787469
