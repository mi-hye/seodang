# Kana writing practice

The learning categories now include **Hiragana** and **Katakana**, with the 46
modern basic characters in each script, ordered by gojūon. Open a character to
see its pronunciation, romaji, and matching character in the other script, then
start writing practice. The existing canvas provides stroke-order animation,
undo, reset, scoring, saved attempts, favorites, review, and category progress.

The basic sets include を / ヲ and ん / ン and retain their original IDs and
46-item progress totals. Historical ゐ / ゑ remain outside the curriculum.
Katakana now also has four separate lessons: voiced/semi-voiced (25), small
kana/long vowel mark (10), yōon (33), and practical loanword spellings (23).
There are 183 learning items overall: 46 hiragana and 137 katakana items.

## Data and loading

- Stable IDs use `kana-` followed by the character's lowercase hexadecimal
  Unicode code point. Combinations join code points with hyphens, e.g.
  `kana-30c6-30a3` for ティ. Category keys for the basic sets remain
  `kana_hiragana` and `kana_katakana`; extension lessons have separate keys.
- Local data implements the existing character/category/stroke fetch interfaces,
  so no Supabase migration or upload is needed. Kana IDs are removed from
  Supabase ID filters when fetching mixed favorites and category mappings.
- Both local category buttons remain available while remote kanji categories
  load or fail. Kana lists, details, guides, and kana-only favorites/progress
  do not require the network.
- All items in each kana category load together, allowing search and
  next-character navigation across the entire category.
- Metadata and stroke templates use dynamic imports. Web exports put the
  templates in a separate chunk; native Metro includes them in the shipped
  bundle for offline use and evaluates them when requested. The 128 source
  glyphs are reused to compose 55 combinations at runtime rather than shipping
  duplicate transformed paths. Small trailing kana use 65% of the base glyph
  scale, sit lower-right, and follow the first glyph's stroke order.
- AnimCJK medians are normalized to the evaluator's 0–100 coordinates.
  Multiple clip paths for the same pen stroke are deduplicated by animation
  order. Smoothed paths have measured lengths for continuous guide animation.
- See [third-party notices](third-party-notices.md) for provenance, licenses,
  the pinned upstream revision, and the rebuild command.

## Verification — 2026-10-02

### Memory cards and recall practice

#### Visual-first follow-up

Small-kana typography follow-up: glyph labels now explicitly render small kana
at 65% of the surrounding font size on a shared baseline rather than relying
on font-specific small-glyph outlines. Applied to detail/practice targets,
construction, highlighted words, comparisons, lists, search, favorites, and
review cards. Full-size counterparts and handwriting templates are unchanged.
Note8 checks include ティ, フォ, キャ, ヴァ, and standalone ッ; 114 tests,
typecheck, and all platform exports pass. Existing lazy data boundaries and
dependencies remain unchanged; no standalone CSS is emitted.

| Output (gzip bytes) | Before small-kana typography | After |
| --- | ---: | ---: |
| Web initial JS, shared desktop/mobile entry | 819,687 | 820,673 |
| Web total JS | 889,777 | 890,726 |
| Android initial/total Hermes bundle | 2,521,143 | 2,520,654 |
| iOS initial/total Hermes bundle | 2,518,796 | 2,519,710 |

The kana detail default view now shows a large construction equation (or a
same-sound script pair), one word with the target highlighted, and side-by-side
comparison tiles. Pronunciation moves to the hero's audio button. Repeated
reading/counterpart cards and development IDs no longer occupy the kana view.
Full cues, pronunciation notes, comparison caveats, and practice instructions
remain available under an accessible, collapsed-by-default disclosure. Its
state resets per character. Kanji details and recall practice are unchanged.

Verified the compact ティ screen and disclosure open/close on the Note8.
TypeScript, all 114 tests, and web/Android/iOS production exports pass. The
lightweight visual card reuses existing components and keeps learning data in
the asynchronous metadata chunk. No dependencies or CSS bundles were added.
Gzip bytes against the text-first memory-card build:

| Output | Before | After |
| --- | ---: | ---: |
| Web initial JS, shared desktop/mobile entry | 819,469 | 819,687 |
| Web total JS, including optional chunks | 889,515 | 889,777 |
| Android initial/total Hermes bundle | 2,517,638 | 2,521,143 |
| iOS initial/total Hermes bundle | 2,517,006 | 2,518,796 |

#### Original memory-card implementation

- All 183 kana learning items have Korean/Japanese memory cues. Basic kana
  use per-glyph word associations; extensions show construction, e.g.
  ホ + ゛ → ボ and テ + ィ → ティ. Selected confusing basic glyphs and all
  extensions have comparisons; hypothetical comparison spellings are labeled
  as comparisons rather than presented as vocabulary. Cues are learning aids,
  not etymological claims. Available example words have a speech button.
- In practice, turn on the guide, then choose **가리고 쓰기 / 隠して書く**.
  This clears the tracing, hides both the target glyph and guide, and leaves
  only romaji as the prompt in either locale. Revealing the answer preserves
  the new drawing for comparison. Changing the target resets this mode.
  Existing scoring, saved progress, and review scheduling are unchanged.
- TypeScript and 114 tests pass, including memory coverage, word associations,
  voiced marks, small kana, and two-glyph comparisons. All platform exports
  succeed. On Note8 verified the ティ card, trace input, hide/clear transition
  (1 / 5 → 0 / 5), and answer reveal preserving the new drawing. No test
  practice result was submitted or saved.
- Bundle guard: memory data stays inside the existing asynchronous metadata
  chunk; no new dependency or CSS. Gzip bytes against the katakana expansion:

| Output | Before | After |
| --- | ---: | ---: |
| Web initial JS, shared desktop/mobile entry | 818,798 | 819,469 |
| Web total JS, including optional chunks | 885,655 | 889,515 |
| Web optional metadata | 4,488 | 7,680 |
| Android initial/total Hermes bundle | 2,512,818 | 2,517,638 |
| iOS initial/total Hermes bundle | 2,510,234 | 2,517,006 |

Neither export emits standalone CSS. Native bundles include the memory data
for offline access; initial web growth is 671 bytes.

### Practical katakana expansion

- Basic sets and progress remain unchanged. ボ is in voiced kana; ヴ is in the
  separate loanword lesson alongside ウィ, ウェ, ウォ, イェ, シェ, ジェ, チェ,
  ティ, ディ, トゥ, ドゥ, デュ, ファ, フィ, フェ, フォ, ヴァ, ヴィ, ヴェ,
  ヴォ, ツァ, ツェ. This is a curated practical set, not every possible spelling.
- Uses the distinction in the Agency for Cultural Affairs'
  [loanword tables](https://www.bunka.go.jp/kokugo_nihongo/sisaku/joho/joho/kijun/naikaku/gairai/honbun01.html)
  and [usage notes](https://www.bunka.go.jp/kokugo_nihongo/sisaku/joho/joho/kijun/naikaku/gairai/honbun05.html).
  Details explain the distinction and show actual words, e.g. ティ → パーティー.
  ヂ・ヅ are marked uncommon in modern loanwords. Small kana/ー pronunciation
  buttons read an example word rather than a meaningless isolated symbol.
- TypeScript and 113 tests pass, including every lesson's offline lookup,
  favorites, category mappings, paging, unique IDs, combination layout, and
  all 183 reference traces at two phone canvas sizes.
- Web, Android, and iOS production exports pass. No dependency or stylesheet
  was added. Reading/example data and stroke geometry remain lazy on web;
  native bundles retain offline data. Gzip bytes against the detail-hint build:

| Output | Before | After |
| --- | ---: | ---: |
| Web initial JS, shared desktop/mobile entry | 817,670 | 818,798 |
| Web total JS, including optional chunks | 875,856 | 885,655 |
| Web optional metadata | 777 | 4,488 |
| Web optional stroke geometry/layout | 22,081 | 27,041 |
| Android initial/total Hermes bundle | 2,497,490 | 2,512,818 |
| iOS initial/total Hermes bundle | 2,496,188 | 2,510,234 |

There is no standalone CSS in either export. Native increases include the
additional offline templates and examples; initial web growth is 1,128 bytes.

On the connected Note8, verified the loanword list (23 items), ティ details with
パーティー and the loanword explanation, and フォ practice with a four-stroke
animated guide, smaller trailing ォ, and drawing input (1 / 4). Did not submit
or save the test drawing. Two-character labels also receive sufficient width
in search, favorites, and review cards.

### Original basic-kana verification

- `npm run quality:check:local`: TypeScript and all 112 tests pass.
- Tests cover all 92 characters, template coverage, actual stroke counts,
  reference drawings at phone canvas sizes, empty-drawing rejection,
  kana-only offline fetching, mixed kana/kanji ID routing, paging, and searches
  by romaji, Korean pronunciation, and the corresponding other-script letter.
- `npx expo export --platform all`: web, Android, and iOS exports succeed.
- Browser checks at 390 × 844 cover both categories, pronunciation/counterpart
  details, guide display, drawing input, scoring, next-character navigation,
  favorite saving, and the resulting `1 / 46` progress entry.
- These exports are JavaScript/Hermes bundles, not signed release builds.

## Android USB testing — 2026-10-02

- Built and installed the debug development client on a Samsung Galaxy Note8
  (`SM-N950N`, Android 9 / API 28), package `com.mihye.seodang`, version 1.0.5.
- Verified the 46-character hiragana list, hiragana `あ` and katakana `ア`
  practice screens, stroke-order guide, drawing input, stroke count, and reset.
  No practice result was submitted or saved on this device.
- The first development-client URL switch caused a native Expo module crash.
  Relaunch and a subsequent cold start succeeded; the crash did not recur in
  the checked flows. Full-device regression and purchase/ad testing remain.
- Metro runs on port 8082, leaving the existing web server on 8081 untouched.
  USB port forwarding connects the phone to `http://127.0.0.1:8082` without
  requiring the phone and Mac to share Wi-Fi. Keep Metro and USB connected.

To rebuild and reinstall from this Mac:

```sh
JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home ANDROID_HOME=/Users/kangmihye/Library/Android/sdk npm run android -- --port 8082
```

If the development client is already installed, start only Metro:

```sh
npx expo start --dev-client --port 8082
```

In a second terminal, reconnect the attached phone and open the app:

```sh
adb -s ce0917192b848c15047e reverse tcp:8082 tcp:8082
adb -s ce0917192b848c15047e shell am start -a android.intent.action.VIEW -d 'exp+seodang://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8082' com.mihye.seodang
```

The APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.
It is a development build that requires Metro, not a standalone release APK.

### List onboarding hint layout

The character-detail hint now belongs to the first character card's list item,
with a 3 dp gap below the card. It no longer depends on a measured card offset
plus a fixed `177` header estimate. The list reserves space for the hint, so it
does not overlap the second card and follows the first card when scrolling.
Verified on the connected Note8 with a taller card that includes a saved score.
Other onboarding steps and saved learning data remain unchanged.

TypeScript, all 112 tests, and web/Android/iOS production exports pass. The
frontend-bundle-guard check retained the existing lightweight route UI and
loading boundaries; no runtime dependency or stylesheet was added. Compared
with the same-day export before the onboarding position adjustments, gzip bytes:

| Output | Before | After |
| --- | ---: | ---: |
| Web initial JS, shared desktop/mobile entry | 817,837 | 816,866 |
| Web total JS, including optional chunks | 876,021 | 875,072 |
| Android initial/total Hermes bundle | 2,497,794 | 2,498,882 |
| iOS initial/total Hermes bundle | 2,496,867 | 2,498,603 |

Neither web export emits standalone CSS; styles remain in the JS bundle. The
existing optional chunks remain asynchronous and native bundles remain single
offline-capable bundles.

### Detail onboarding hint layout

The writing-practice hint now belongs to the action button group, with a 3 dp
gap below the button and an upward-pointing tail. Inline and floating actions
share the same group instead of positioning the hint at a fixed screen-bottom
coordinate. Removed the obsolete fixed-coordinate helper and its two tests.
Verified the inline hint on the connected Note8; the floating variant was not
separately exercised on-device. TypeScript, all 110 remaining tests, and
web/Android/iOS production exports pass.

The bundle guard retained existing loading boundaries and dependencies. Against
the list-hint export above, gzip bytes are:

| Output | Before | After |
| --- | ---: | ---: |
| Web initial JS, shared desktop/mobile entry | 816,866 | 817,670 |
| Web total JS, including optional chunks | 875,072 | 875,856 |
| Android initial/total Hermes bundle | 2,498,882 | 2,497,490 |
| iOS initial/total Hermes bundle | 2,498,603 | 2,496,188 |

Neither export emits standalone CSS, and optional web chunks remain separate.

## Bundle comparison

Equivalent production exports, gzip sizes in bytes:

| Output | Before | After | Change |
| --- | ---: | ---: | ---: |
| Web initial entry (shared desktop/mobile) | 815,287 | 817,837 | +2,550 |
| Web total JavaScript, including optional chunks | 850,606 | 876,021 | +25,415 |
| Web kana stroke chunk, loaded for practice | 0 | 22,081 | +22,081 |
| Android Hermes bundle (initial and total) | 2,460,295 | 2,497,794 | +37,499 |

Web has no standalone CSS bundles in either export; React Native Web styles
remain in the JavaScript entry. The native increase includes the offline
92-character templates. No new runtime dependency was added. iOS exports were
verified, but no before/after iOS size comparison was performed.

The original web baseline failed because the native-only AdMob package entered
the web dependency graph. Both the web size baseline and the updated export
include the same `rewardedReadingAd.web.ts` stub, which preserves the existing
unavailable-on-web behavior and allows a like-for-like kana size comparison.
