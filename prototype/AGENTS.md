# Prototype UI preferences

- A group of two action buttons must use `display: flex`, `flex-direction: row`, and `flex-wrap: nowrap`. Never stack the two buttons vertically, including mobile or large-text layouts.
- Reuse the shared `.button-pair` wrapper. Give both buttons equal flexible width, `min-width: 0`, and zero outer margins. Keep labels short; text may wrap inside a button, but the buttons must remain side by side.
- Preserve this rule when adding lessons, completion actions, or dialogs. Verify narrow mobile widths before shipping.

- Wrap prose at words or meaningful phrases. Preserve Korean words with `word-break: keep-all`; render Japanese learning sentences through `phraseText` with explicit phrase boundaries when no spaces exist. Keep original text and audio unchanged. Allow emergency wrapping only when a single unit cannot fit, and check narrow screens with large text.

- 한국어 UI 문구를 쓰거나 다듬을 때 사용자가 요청한 `humanize-korean` 스킬을 적용한다. 설명은 짧고 구체적으로 쓰고, 이미 자연스러운 문장은 억지로 바꾸지 않는다. 학습 내용과 의미, 수치, 기존 해요체를 보존한다.

- 서당 UI 변경에는 `/Users/kangmihye/.codex/skills/seodang-design/SKILL.md`의 사용자 지정 디자인 규칙을 적용한다. 모든 재생 스피커는 해당 글씨 오른쪽 같은 가로 행에 배치한다. 공유 `.audio-text-row` 또는 동등한 기존 행을 사용하고, 좁은 화면에서도 스피커를 아래로 내리지 않는다.
