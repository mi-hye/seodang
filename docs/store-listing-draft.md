# Seodang Store Listing Draft

Last updated: 2026-06-08

This draft is for App Store / Play Store listing preparation. Keep the copy
consistent with the actual release build before submission.

## App Identity

- Default app name: Seodang
- Korean App Store name: 서당
- Japanese App Store name: 書堂
- Bundle/package: `com.mihye.seodang`
- Primary category: Education
- Secondary category candidate: Reference

## Storefront Localization Strategy

- Korea storefront / Korean metadata: use `서당`.
- Japan storefront / Japanese metadata: use `書堂`.
- Default or English fallback metadata: use `Seodang`.
- The in-app UI already localizes the app name through i18n:
  Korean `서당`, Japanese `書堂`.
- The installed app display name is also localized through Expo `locales`:
  Korean `서당`, Japanese `書堂`.
- App Store listing names still need to be configured separately in App Store
  Connect localization settings.

## App Store Metadata Draft

### Korean

App name:

서당

Subtitle:

한자 쓰기와 획순 연습

Promotional text:

카테고리별 한자를 고르고, 획순을 확인한 뒤 직접 써보며 학습 흐름을 이어가세요.

Description:

서당은 한자를 고르고, 읽고, 직접 써보며 익히는 한자 학습 앱입니다.

JLPT, 일본 학년별, 상용 한자, 획수별 카테고리에서 학습할 한자를 선택하고, 한자 상세에서 뜻과 읽기, 예문을 확인한 뒤 쓰기 연습으로 이어갈 수 있습니다.

주요 기능:

- 카테고리별 한자 목록
- 한자, 뜻, 읽기 기반 검색
- 한자 상세 정보와 예문
- 획순 가이드 확인
- 직접 쓰기 연습과 결과 피드백
- 즐겨찾기 저장
- 최근 연습 이어가기
- 카테고리별 진행률
- 학습 알림
- 한국어 / 일본어 UI

서당은 매일 한 글자씩 꾸준히 익히는 흐름을 돕습니다.

Keywords:

한자,일본어,JLPT,획순,쓰기,서예,공부,학습,일본,漢字

### Japanese

App name:

書堂

Subtitle:

漢字の書き取りと筆順練習

Promotional text:

カテゴリごとに漢字を選び、筆順を確認しながら書き取り練習を続けられます。

Description:

書堂は、漢字を選び、読み、実際に書きながら学習するための漢字練習アプリです。

学年別、常用漢字、画数別のカテゴリから学習する漢字を選び、詳細画面で意味、読み、例文を確認してから書き取り練習へ進めます。

主な機能:

- カテゴリ別の漢字一覧
- 漢字、意味、読みで検索
- 漢字の詳細情報と例文
- 筆順ガイド
- 書き取り練習と結果フィードバック
- お気に入り保存
- 最近の練習から再開
- カテゴリ別の進捗
- 学習通知
- 한국어 / 日本語 UI

書堂は、毎日一文字ずつ漢字を学ぶ習慣をサポートします。

Keywords:

漢字,日本語,書き取り,筆順,学習,練習,常用漢字,小学生,勉強,書堂

## Screenshot Plan

Detailed capture guide:

- `docs/app-store-screenshot-plan.md`

Recommended first set:

- Home with onboarding hidden
- Category selection
- Kanji list with search and favorite button
- Kanji detail with example
- Writing practice with stroke guide
- Practice result with feedback
- Favorites
- Notification settings

Caption ideas:

- 카테고리별로 한자를 고르세요
- 획순을 확인하고 직접 써보세요
- 결과를 보고 다음 한자로 이어가세요
- 자주 볼 한자는 즐겨찾기에 저장하세요

Japanese caption ideas:

- カテゴリごとに漢字を選べます
- 筆順を見ながら書き取り練習
- 結果を確認して次の漢字へ
- よく見る漢字をお気に入りに保存

## App Review Notes

- No login is required.
- No paid content is currently included.
- No ads are currently included.
- The app uses local notifications only for study reminders.
- User practice history is stored locally on the device.
- Public kanji content is fetched from Supabase.

## Before Submission

- Privacy policy URL:
  `https://mi-hye.github.io/seodang/privacy-policy.html`
- Add the privacy policy link in App Store Connect.
- Confirm the in-app privacy policy screen is reachable from Settings.
- Verify screenshots match the submitted build.
- Confirm App Store privacy labels and Google Play Data safety answers match
  actual app behavior.
- Run the full iOS checklist in `docs/ios-release-checklist.md`.

References:

- Apple product page guidance:
  https://developer.apple.com/app-store/product-page/
- App Store Connect app information:
  https://developer.apple.com/help/app-store-connect/reference/app-information/
