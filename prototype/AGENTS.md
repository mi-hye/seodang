# Prototype UI preferences

- A group of two action buttons must use `display: flex`, `flex-direction: row`, and `flex-wrap: nowrap`. Never stack the two buttons vertically, including mobile or large-text layouts.
- Reuse the shared `.button-pair` wrapper. Give both buttons equal flexible width, `min-width: 0`, and zero outer margins. Keep labels short; text may wrap inside a button, but the buttons must remain side by side.
- Preserve this rule when adding lessons, completion actions, or dialogs. Verify narrow mobile widths before shipping.

- Wrap prose at words or meaningful phrases. Preserve Korean words with `word-break: keep-all`; render Japanese learning sentences through `phraseText` with explicit phrase boundaries when no spaces exist. Keep original text and audio unchanged. Allow emergency wrapping only when a single unit cannot fit, and check narrow screens with large text.

- 한국어 UI 문구를 쓰거나 다듬을 때 사용자가 요청한 `humanize-korean` 스킬을 적용한다. 설명은 짧고 구체적으로 쓰고, 이미 자연스러운 문장은 억지로 바꾸지 않는다. 학습 내용과 의미, 수치, 기존 해요체를 보존한다.

- 서당 UI 변경에는 `/Users/kangmihye/.codex/skills/seodang-design/SKILL.md`의 사용자 지정 디자인 규칙을 적용한다. 모든 재생 스피커는 해당 글씨 오른쪽 같은 가로 행에 배치한다. 공유 `.audio-text-row` 또는 동등한 기존 행을 사용하고, 좁은 화면에서도 스피커를 아래로 내리지 않는다.

## Local device builds

- Use `npm run ios:sync:dev` when installing a local development build on the connected iPhone. This keeps the learning-language selector available in settings. Do not use the production `ios:sync` command for local device updates unless the user explicitly requests a production build.
- Keep production builds unchanged; `npm run build` and `npm run ios:sync` must retain production settings.

- 수업 화면의 진행 상태는 공통 진행 바로 표시한다. 일반 학습·복습·영상·대화에 `N / 전체 문항 수` 같은 별도 숫자 진행 표시를 넣지 않는다.
- 문장 조립은 제목·목표 문장·답 영역·조각·동작 버튼으로 구성하고, 화면으로 알 수 있는 반복 안내나 빈칸 안내를 덧붙이지 않는다. 별도 힌트 보기와 풀이 전 정답을 알려 주는 일반 힌트는 표시하지 않는다. 정답 뒤 표현 해설과 선택한 오답의 이유는 유지한다.

- 수업 생성 또는 기존 수업의 복습 확장에는 `/Users/kangmihye/.codex/skills/seodang-lessons/SKILL.md`를 적용한다. 지정된 수업부터 적용하고 다른 수업에 자동 확장하지 않는다.
