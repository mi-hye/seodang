# Third-Party Notices

Last updated: 2026-10-02

Seodang uses open-source and public learning data to provide kana and kanji metadata,
stroke order, category mapping, and writing-practice references.

## Data Sources

### KANJIDIC2

- Purpose: kanji metadata, readings, meanings, grade information
- License: Creative Commons Attribution-ShareAlike 4.0
- Source: https://www.edrdg.org/wiki/KANJIDIC_Project.html
- License details: https://www.edrdg.org/edrdg/licence.html

### KanjiVG

- Purpose: kanji stroke order and SVG path data
- License: Creative Commons Attribution-ShareAlike 3.0
- Source: https://kanjivg.tagaini.net/index.html
- License details: https://creativecommons.org/licenses/by-sa/3.0/

### AnimCJK

- Purpose: supplemental stroke data for characters not covered by KanjiVG
- License: Arphic Public License for kanji/hanzi SVG files
- Source: https://github.com/parsimonhi/animCJK
- License details: https://www.freedesktop.org/wiki/Arphic_Public_License/

### AnimCJK Kana

- Purpose: offline handwriting guides for 46 basic hiragana and 137 katakana learning items (128 source glyphs across both scripts; multi-glyph items reuse them)
- Copyright: 2016–2026 FM-SH
- License: GNU Lesser General Public License 3.0 or later (kana are not Arphic-derived)
- Pinned source: https://github.com/parsimonhi/animCJK/tree/ec5e17cca76c87587790bcbce5ea0b4d4fb753d6/svgsJaKana
- Adaptations: deduplicate clip paths belonging to one pen stroke, smooth medians with Catmull–Rom interpolation, and scale coordinates from the SVG viewBox to a 0–100 canvas. Small kana are reduced; combinations arrange source glyphs left-to-right with continuous stroke order.
- Rebuild: `npm run kana:build:strokes`
- Adapted source: `src/data/kanaStrokes.ts`, `src/data/kanaStrokeCounts.ts`, and `src/data/kanaStrokeLayout.ts`
- License texts: `licenses/animcjk/COPYING.txt`, `licenses/animcjk/LGPL.txt`, and `licenses/animcjk/GPL.txt`

### JLPT Kanji Category Data

- Purpose: JLPT category mapping
- License: open-source JLPT kanji JSON source used by the data pipeline
- Source: https://kanjiapi.dev/
- Related repository: https://github.com/onlyskin/kanjiapi.dev

## Store Review Note

The app uses these sources as learning data. Attribution and license notices are
provided in the app Settings screen and in this document.
