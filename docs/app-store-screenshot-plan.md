# App Store Screenshot Plan

Last updated: 2026-06-08

Use this plan when capturing the first App Store screenshot set. The goal is to
show the real app flow, not marketing-only mockups.

## Capture Setup

- Use an iOS simulator or device with a clean install.
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

## Recommended Screenshot Set

### 1. Home

Purpose:

- Show the app's main learning entry point and saved learning state.

State to prepare:

- At least one favorite exists.
- At least one recent practice exists.
- Category progress has one or two visible rows.

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

## App Store Connect Notes

- Korea storefront should use Korean captions.
- Japan storefront should use Japanese captions.
- If only one screenshot set is submitted first, use Korean screenshots and add
  Japanese screenshots before Japan storefront launch.
- Keep screenshot text consistent with the submitted build. Do not show features
  that are not available yet.
