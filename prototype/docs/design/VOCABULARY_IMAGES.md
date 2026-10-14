# 사건 어휘 그림

Built-in image_gen 사용. 기존 카페의 목재와 따뜻한 빛 분위기에 맞춘 학습용 그림. 이미지에 텍스트나 UI를 넣지 않음. 실제 프로젝트에 복사해 표현 익히기와 배운 표현에서 사용하며, 카페 배경은 유지함.

- assets/word-blue-bag-v1.png — 파란 가방
- assets/word-near-window-v1.png — 창문 옆

## 최종 프롬프트: 파란 가방
Use case: illustration-story. Create one polished educational vocabulary illustration for a Japanese learning app set in a cozy wooden cafe. Concept: あおい かばん (blue bag). A single clearly blue canvas backpack, rectangular body, top carry handle, front pocket, simple zipper, sitting upright on a wooden cafe chair. Medium close view, entire bag visible and occupying most of frame. Warm painterly realistic textures, soft golden cafe light but retain unmistakably BLUE fabric; dark brown softly blurred wooden cafe interior. Clean readable silhouette at phone size. Landscape 3:2 composition. No people, no animals, no text, letters, captions, labels, logos, UI, or borders. This is only an illustration asset; all text and controls are separate UI.

## 최종 프롬프트: 창문 옆
Use case: illustration-story. Create one educational vocabulary illustration for a Japanese learning app set in a cozy wooden cafe. Concept: まどの そば (beside the window). Clearly show a large wooden-framed glass WINDOW and one simple blue canvas backpack on a wooden chair immediately next to the window. Window has a sill and multiple panes, no door handle, no door. Spatial relation must be unmistakable at small phone size: backpack and chair touching the window-side area. Three-quarter interior view, restrained warm painterly realistic textures and soft golden light, dark wooden cafe materials, blue bag retains blue color. Clean uncluttered composition limited to window, chair, bag and wall; no extra characters or objects. Landscape 3:2. No people, animals, text, labels, arrows, captions, letters, logos, UI, borders. This is only an illustration asset; all words and buttons are separate UI.

## 설정 이동
학습 홈은 루트 화면이므로 뒤로가기 버튼을 숨긴다. 설정의 난이도 선택은 level 액션으로 현재 난이도와 도움 수준만 변경하고 kana/episode/encountered 기록은 보존한다. 온보딩 재진입 없이 해당 난이도의 홈을 표시한다.
