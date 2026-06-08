# iOS Release Checklist

Last updated: 2026-06-08

Use this checklist before creating the first App Store production submission.

## Release Blockers

- Apple Developer Program membership must be active.
- App Store Connect app record must be created for `com.mihye.seodang`.
- Production EAS iOS build must be uploaded to App Store Connect.
- Public privacy policy URL must be entered:
  `https://mi-hye.github.io/seodang/privacy-policy.html`

## App Store Connect Inputs

- Korean App Store name: `서당`
- Japanese App Store name: `書堂`
- Default or English fallback name: `Seodang`
- Bundle ID: `com.mihye.seodang`
- Category: `Education`
- Secondary category candidate: `Reference`
- Privacy Policy URL:
  `https://mi-hye.github.io/seodang/privacy-policy.html`
- Support email: `satge13@gmail.com`
- Description, subtitle, keywords, and screenshot captions:
  `docs/store-listing-draft.md`
- Screenshot capture plan:
  `docs/app-store-screenshot-plan.md`
- App privacy answers:
  `docs/store-privacy-answers.md`
- Configure App Store Connect localizations:
  `ko-KR` uses Korean copy and `서당`, `ja-JP` uses Japanese copy and `書堂`.
- Verify the installed iOS home-screen display name uses `서당` on Korean
  devices and `書堂` on Japanese devices.

## Build Verification

- Run `npx tsc --noEmit`.
- Run the app on iOS simulator.
- Verify the production EAS profile uses the expected Expo config.
- Verify Supabase URL and anon key exist in the EAS production environment.
- Verify the app starts without Metro after installing the built `.ipa` or
  TestFlight build.

## First Launch QA

- Fresh install opens the app without existing AsyncStorage data.
- Onboarding appears only once.
- Home onboarding highlights the intended action.
- Category onboarding highlights the first visible category item for the active
  locale.
- List/detail/practice/result onboarding steps are readable and do not block the
  wrong touch targets.
- Reopening the app after completing onboarding does not show onboarding again.

## Core Flow QA

- Home loads favorites, recent practice, and category progress.
- Category selection loads groups and categories from Supabase.
- Korean UI shows JLPT categories.
- Japanese UI hides JLPT categories and shows Japanese-relevant groups.
- Selecting a category opens the kanji list for that category.
- Kanji list search input scrolls/moves correctly on iOS.
- Favorite star can add and remove a kanji without list flicker.
- Kanji detail shows meaning, readings, and examples when available.
- Practice screen shows stroke order and accepts drawing input.
- Result screen shows feedback and next-kanji navigation.
- Next kanji follows the current category order.
- Back navigation does not stack duplicate list/practice/result screens.

## Empty And Failure State QA

- Supabase offline or failed category fetch shows retry UI.
- Failed list fetch shows retry UI.
- Failed recent-practice continuation shows retry UI.
- Empty favorites shows `목록이 비어있어요` and the kanji navigation action.
- Empty category/list states do not show misleading loading text.
- Loading states use the kanji animation where intended.

## Local Data QA

- Favorites persist after app restart.
- Recent practice updates only after submitting a practice result.
- Category progress updates after practice result submission.
- Category progress reset also resets the currently practiced category progress.
- Language setting persists.
- Theme setting persists.
- Notification settings persist.

## Notification QA

- Notification permission request appears only when reminders are used.
- Reminder can be created.
- Reminder can be disabled.
- Reminder name can be edited.
- Reminder deletion works.
- Daily, weekday, and weekend repeat labels display correctly.
- Dark theme toggle colors remain visible.

## Visual QA

- Light theme and dark theme are both checked.
- App icon, adaptive icon, favicon, and notification icon are correct.
- Store screenshots are captured using `docs/app-store-screenshot-plan.md`.
- Header background does not flicker in dark theme.
- Settings cards have consistent sizing.
- Privacy policy screen is reachable from Settings.
- Privacy policy web page opens at the public URL.

## Store Review Notes

- No login is required.
- No paid content is included.
- No ads are included.
- No analytics or crash reporting SDK is currently included.
- Practice history, favorites, settings, and reminders are stored locally.
- Public learning content is fetched from Supabase.

## Pre-Submission Commands

```sh
npx tsc --noEmit
npx eas-cli@latest build -p ios --profile production
```

Submit after the production build is available:

```sh
npx eas-cli@latest submit -p ios --profile production
```
