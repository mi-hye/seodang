# 세 사건으로 배우는 46글자

사용자 요청: 5글자 단위의 10사건을 3사건으로 통합하고 전용 일러스트 적용.

1. 사라진 우산 — あ〜そ 15글자
2. 바뀐 배달 상자 — た〜ほ 15글자
3. 마지막 보관 봉투 — ま〜ん 16글자

실제 저장 에셋:
- assets/kana-case-umbrella-v1.png
- assets/kana-case-parcel-v1.png
- assets/kana-case-envelope-v1.png

내장 image_gen 사용. 3:2 손그림풍 카페 일러스트로 우산/배달 상자/보관 봉투를 표현. 홈, 사건 소개, 최종 물건 찾기, 해결 화면에서 실제 에셋 사용. 텍스트와 정답 선택은 HTML UI로 분리.

kana.version=4. 원래 단일 5글자, v2 10묶음, v3 10사건 기록을 읽을 수 있다. 기존 learned는 보존하고, 배우던 글자는 합쳐진 사건 안의 위치로 이전한다. 기존 원본은 previousCourse에 보관한다. 이전 묶음들을 모두 완료한 구간은 잠금 해제 이수로 유지하지만 새 통합 사건을 해결한 것으로 잘못 표시하지 않는다. 기존 소리 퀴즈가 통합 사건 글자를 모두 포함하지 않으면 남은 글자부터 익힌 뒤 통합 확인 문제를 진행한다. 새 사건은 15/15/16글자 학습과 듣기 확인 후 마지막 두 표식을 맞혀 완료한다.

초기 JS gzip 17,519 → 18,004 bytes, 총 JS 26,689 → 26,430 bytes. 공통 CSS 8,815 → 8,856 bytes. 사건 UI/CSS는 기존 지연 로딩 유지. 신규 외부 의존성 없음. 테스트 14개 통과(전체 46자/3사건 완료, 잠금·재개·오답, 구버전 기록/학습 위치/원본 보존, TTS).

## 최종 이미지 프롬프트
### umbrella
Use case: illustration-story. Create a landscape 3:2 storybook illustration asset for a beginner Japanese learning app. The entrance of a cozy wooden Korean hanok cafe on a rainy afternoon. Three closed umbrellas, blue, muted red and cream, standing in separate slots of a wooden umbrella rack. Small blank cream tags tied to the rack. Window with raindrops, warm lamplight. Clear focus on umbrellas and rack. A gentle lost-umbrella mystery. Art direction: clearly hand-painted gouache and colored-pencil illustration, visible paper grain and soft brush edges, simplified rounded shapes, elegant quiet picture-book aesthetic; NOT photorealistic, NOT a photograph, not 3D. Consistent warm brown, cream, muted teal-blue palette. Readable at phone size, full main objects visible, uncomplicated composition. No people, animals, mascots, text, lettering, numbers, logos, arrows, captions, UI, or borders. Every tag completely blank; interactive letters will be overlaid separately in real UI.

### parcel
Use case: illustration-story. Create a landscape 3:2 storybook illustration asset for a beginner Japanese learning app. The delivery corner of a cozy wooden Korean hanok cafe. Three distinct small kraft cardboard delivery boxes arranged on a wooden counter, each with a blank cream luggage tag. One box tied with muted blue twine, another with muted red twine, another with cream twine. Warm amber lamplight, background shelves softly suggested. Clear focus on boxes and blank tags. A gentle mixed-up-delivery mystery. Art direction: clearly hand-painted gouache and colored-pencil illustration, visible paper grain and soft brush edges, simplified rounded shapes, elegant quiet picture-book aesthetic; NOT photorealistic, NOT a photograph, not 3D. Consistent warm brown, cream, muted teal-blue palette. Readable at phone size, full main objects visible, uncomplicated composition. No people, animals, mascots, text, lettering, numbers, logos, arrows, captions, UI, or borders. Every tag completely blank; interactive letters will be overlaid separately in real UI.

### envelope
Use case: illustration-story. Create a landscape 3:2 storybook illustration asset for a beginner Japanese learning app. The lost-and-found counter of a cozy wooden Korean hanok cafe at dusk. Three cream and kraft paper envelopes in separate slots of a small wooden sorting tray. Each has a small blank paper tag and a simple cord closure, muted blue, red and tan accents. Window softly glowing in the background, warm lamplight. Clear focus on envelopes and sorting tray. A gentle final lost-letter mystery. Art direction: clearly hand-painted gouache and colored-pencil illustration, visible paper grain and soft brush edges, simplified rounded shapes, elegant quiet picture-book aesthetic; NOT photorealistic, NOT a photograph, not 3D. Consistent warm brown, cream, muted teal-blue palette. Readable at phone size, full main objects visible, uncomplicated composition. No people, animals, mascots, text, lettering, numbers, logos, arrows, captions, UI, or borders. Every tag completely blank; interactive letters will be overlaid separately in real UI.
