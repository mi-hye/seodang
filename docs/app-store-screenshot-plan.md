# App Store Screenshot Plan

Last updated: 2026-06-12

Use this plan when capturing the first App Store screenshot set. The goal is to
show the real app flow, not marketing-only mockups.

## Capture Setup

- Use an iOS simulator or device with a clean install.
- Recommended simulator: `iPhone 16 Plus`.
- Use light theme first.
- Complete onboarding before capturing regular store screenshots.
- Use Korean UI for Korea storefront screenshots.
- Use Japanese UI for Japan storefront screenshots.
- Prefer a large iPhone device class for the first set, such as iPhone 16 Plus.
- Ensure Supabase is reachable and the app is not using forced failure/empty
  state test flags.
- Use data that looks complete:
  category list loaded, kanji list loaded, at least one favorite, and one recent
  practice item.
- Turn off low power mode and avoid simulator status overlays.
- Capture after loading finishes. Do not capture skeletons, retry screens, or
  permission prompts.

## Capture Runbook

Use this order for the first Korean screenshot set.

1. Fresh install or clear app data.
2. Open the app and complete onboarding.
3. Set language to Korean and theme to light.
4. Open `카테고리` and choose `JLPT N5`.
5. Add at least three common kanji to favorites.
6. Open one common kanji detail, then complete one clean writing practice.
7. Return to Home so recent practice and category progress are visible.
8. Capture screenshots in the order below.

Recommended demo data:

- Category: `JLPT N5`
- Detail/practice kanji candidates: `日`, `月`, `水`, `火`, `人`, `本`
- Favorites candidates: `日`, `月`, `水`
- Notification time: `20:00`
- Notification title: `저녁 한자 연습`

Avoid these states:

- Rare kanji with reference-style examples.
- Empty favorites or empty review screens.
- Search results with zero items.
- Practice drawings that look messy or intentionally wrong.
- Permission-denied notification warning.

## File Naming

Use predictable names so App Store Connect upload is easier.

- Korean iPhone set:
  `ko-iphone-01-home.png`
  `ko-iphone-02-categories.png`
  `ko-iphone-03-list.png`
  `ko-iphone-04-detail.png`
  `ko-iphone-05-practice.png`
  `ko-iphone-06-result.png`
  `ko-iphone-07-favorites.png`
  `ko-iphone-08-notifications.png`
- Japanese iPhone set:
  `ja-iphone-01-home.png`
  `ja-iphone-02-categories.png`
  `ja-iphone-03-list.png`
  `ja-iphone-04-detail.png`
  `ja-iphone-05-practice.png`
  `ja-iphone-06-result.png`
  `ja-iphone-07-favorites.png`
  `ja-iphone-08-notifications.png`

## Recommended Screenshot Set

### 1. Home

Purpose:

- Show the app's main learning entry point and saved learning state.

State to prepare:

- At least one favorite exists.
- At least one recent practice exists.
- Category progress has one or two visible rows.
- Recommended visible progress: `JLPT N5`, `초1`.
- If the onboarding hint appears, dismiss it before capture.

Korean caption:

- 오늘 배울 한자를 바로 시작하세요

Japanese caption:

- 今日学ぶ漢字をすぐに始められます

### 2. Category Selection

Purpose:

- Show that kanji can be browsed by category.

State to prepare:

- Korean UI: JLPT, 학년별, 상용 한자, 획수별 groups are visible when available.
- Japanese UI: JLPT is hidden, Japanese-relevant groups are visible.
- For Korean screenshots, keep the first screen near the top so `JLPT` appears.
- If capturing radicals, leave the collapsed `더보기` state visible.

Korean caption:

- 카테고리별로 한자를 고르세요

Japanese caption:

- カテゴリごとに漢字を選べます

### 3. Kanji List

Purpose:

- Show category-specific kanji, search, and favorite action.

State to prepare:

- Open a populated category such as JLPT N5 for Korean screenshots.
- Search input should be empty unless intentionally showing search.
- Favorite star should be visible on a list item.
- Recommended category: `JLPT N5`.
- Recommended scroll position: top of list.
- Progress subtitle should show a natural value such as `1/79`.

Korean caption:

- 찾고 싶은 한자를 빠르게 확인하세요

Japanese caption:

- 学びたい漢字をすばやく探せます

### 4. Kanji Detail

Purpose:

- Show meaning, readings, and example content.

State to prepare:

- Pick a kanji with complete meaning, readings, and examples.
- Prefer a common simple kanji for readability.
- Recommended characters: `日`, `月`, `水`, `火`, `人`, `本`.
- Confirm the example section says `예문` rather than `참고`.

Korean caption:

- 뜻과 읽기, 예문을 함께 확인하세요

Japanese caption:

- 意味、読み、例文をまとめて確認できます

### 5. Writing Practice

Purpose:

- Show the core writing practice experience.

State to prepare:

- Open a kanji practice screen.
- Show stroke guide or a partially drawn character if it looks clean.
- Avoid messy drawings in the final screenshot.
- Recommended character: the same one used in the detail screenshot.
- If using a partial drawing, keep the strokes inside the guide area.

Korean caption:

- 획순을 보며 직접 써보세요

Japanese caption:

- 筆順を見ながら書いて練習できます

### 6. Practice Result

Purpose:

- Show feedback and continuation to the next kanji.

State to prepare:

- Submit a clean enough drawing to produce a reasonable score.
- Ensure the next-kanji action is visible.
- Prefer a passing result. Avoid a very low score in store screenshots.
- If feedback text is too long or clipped, retake with a cleaner drawing.

Korean caption:

- 결과를 보고 다음 한자로 이어가세요

Japanese caption:

- 結果を確認して次の漢字へ進めます

### 7. Favorites

Purpose:

- Show saved kanji as a useful review surface.

State to prepare:

- Add 3 or more favorites.
- Avoid empty-state screenshot for the store page.
- Recommended favorites: `日`, `月`, `水`.
- Make sure each card has meaning text, not `-`.

Korean caption:

- 자주 보고 싶은 한자를 저장하세요

Japanese caption:

- よく見る漢字をお気に入りに保存できます

### 8. Study Notifications

Purpose:

- Show habit-building reminder settings.

State to prepare:

- Create one reminder with a simple title.
- Use a normal time such as 08:00 or 20:00.
- Keep permission warning hidden if permission is granted.
- Recommended title: `저녁 한자 연습`.
- Recommended repeat: every day.
- Keep the native time picker closed for the final screenshot unless the store
  screenshot intentionally shows time selection.

Korean caption:

- 원하는 시간에 학습 알림을 받아보세요

Japanese caption:

- 好きな時間に学習リマインダーを設定できます

## Screenshot Quality Checks

- No onboarding dim overlay appears in store screenshots unless intentionally
  showing onboarding.
- No loading state is visible.
- No retry or failure state is visible.
- No placeholder `-` or empty card appears in primary screenshots.
- Header title and content are not clipped.
- Safe-area spacing is correct on iPhone with Dynamic Island.
- Dark theme screenshots are optional for the first submission, but should be
  checked during QA.
- Text must be readable at App Store thumbnail size.
- Captions must not claim features that are locked, missing, or not visible in
  the screenshot.
- If screenshots include Pro-related screens, make sure paid/locked behavior is
  consistent with the submitted build.

## Optional Secondary Screenshots

Use these only if the first set needs more variety.

- Category progress: shows progress across recent categories.
- Review: shows due-review flow after at least one practiced kanji is due.
- Mistake note: useful if enough failed attempts exist.
- Review stats: useful for explaining the Pro value, but avoid if the feature is
  locked in the submitted build.

## First Submission Recommendation

For the first iOS submission, use 6 to 8 Korean screenshots.

Minimum recommended set:

1. Home
2. Category Selection
3. Kanji List
4. Kanji Detail
5. Writing Practice
6. Practice Result

Add these if they look polished:

7. Favorites
8. Study Notifications

## App Store Connect Notes

- Korea storefront should use Korean captions.
- Japan storefront should use Japanese captions.
- If only one screenshot set is submitted first, use Korean screenshots and add
  Japanese screenshots before Japan storefront launch.
- Keep screenshot text consistent with the submitted build. Do not show features
  that are not available yet.
