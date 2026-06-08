# Seodang Privacy Policy Draft

Last updated: 2026-06-08

This draft is for App Store / Play Store preparation. Review the hosting URL
and actual release behavior before publishing.

## Service

Seodang is a kanji learning app. The app lets users browse kanji categories,
view kanji details, practice writing, save favorites, track recent practice, and
configure study reminders.

## Data We Store On Your Device

Seodang stores the following data locally on the user's device:

- App language and theme settings
- First-run onboarding progress
- Favorite kanji
- Practice progress, scores, attempts, and recent practice history
- Category progress reset state
- Study reminder settings, including title, time, repeat option, message, and enabled state

This local data is stored with AsyncStorage and is used only to provide app
features. It is not sold.

## Data We Fetch From Supabase

Seodang fetches public kanji learning data from Supabase, including:

- Kanji metadata
- Category groups and categories
- Kanji-category mappings
- Stroke order data
- Example sentences when available

These requests are made so the app can display learning content. Seodang does
not currently require user login and does not upload individual user practice
history to Supabase.

## Notifications

If the user enables study reminders, Seodang asks for notification permission
and schedules local notifications on the device.

Notification settings are stored locally. The app does not send reminder
messages to a remote server.

## Data Sharing

Seodang does not sell user data.

The app uses Supabase as a backend content provider. Network requests to
Supabase may include standard technical information such as IP address, request
metadata, and device/browser network information processed by Supabase as part
of providing the service.

## Third-Party Services

Seodang uses the following third-party services and libraries:

- Supabase, for public kanji data and Edge Functions
- Expo / React Native, for app runtime, builds, and notifications

Open-source data source and license notices are available in the app Settings
screen and in `docs/third-party-notices.md`.

Before release, confirm whether any additional analytics, crash reporting, ads,
or authentication SDKs have been added. If so, update this policy and the store
privacy forms.

## Children's Privacy

Seodang is an educational app, but it does not currently create accounts or ask
users to provide personal information. If the app is later targeted to children
or collects children's personal information, this policy and store settings must
be updated before release.

## Data Retention

Local app data remains on the user's device until the user changes settings,
removes saved items, clears app data, or uninstalls the app.

Remote kanji content is public learning content managed by the app operator.

## User Choices

Users can:

- Change app language and theme in Settings
- Add or remove favorite kanji
- Reset category progress
- Enable, edit, or delete study reminders
- Disable notifications in device settings
- Delete local app data by uninstalling the app or clearing app storage

## Contact

For privacy questions or support requests, contact:

Email: satge13@gmail.com

## Store Submission Notes

Apple App Store:

- App Store Connect requires a publicly accessible Privacy Policy URL.
- Apple App Review Guidelines also require the privacy policy to be accessible
  within the app.

Google Play:

- The Play Console Data safety form must match this privacy policy and the app's
  actual behavior.
- If additional SDKs are added, update both the policy and Data safety answers.

References:

- Apple App Store Connect app privacy help:
  https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- Apple App Review Guidelines:
  https://developer.apple.com/app-store/review/guidelines/
- Google Play Data safety:
  https://support.google.com/googleplay/android-developer/answer/10787469
