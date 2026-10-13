# 서당개 v3 — 교체 가능한 임시 디자인

사용자 요청: “개도 좀 바꿔줘”. 새 Lantern Stage UI에 맞춰 평면 SVG 대신 따뜻한 그림책 질감의 강아지를 제작한다. 확정 요구는 캐릭터 교체이며, 품종·목수건·화풍은 이번 구현의 임시 디자인 선택이다.

- 제작: 내장 imagegen, 투명 배경 생성.
- 프로젝트 에셋: `assets/seodang-dog-v3.png`
- 교체 지점: `src/media.js`의 `assets.mascot`. 여섯 감정 슬롯은 현재 같은 기본 자세를 공유하며 향후 개별 에셋으로 교체할 수 있다.
- 적용: 시작 화면, 모든 안내 컴포넌트, favicon, iOS 체험판 앱 아이콘.
- 이전 `assets/dog.svg`는 보존한다. 음성 설정과 사건 진행 데이터는 변경하지 않는다.

## 최종 생성 프롬프트

Create a single beautiful full-body mascot asset for a Korean language learning story game called Seodang. A small cream-colored Jindo-like puppy with soft warm ivory fur, subtly toasted ears, natural dark expressive eyes and a tiny charcoal nose, wearing a simple muted sage green triangular neckerchief. Seated in a relaxed three-quarter pose, all paws and softly curled tail visible, looking warmly toward the viewer with a gentle curious expression. Refined hand-painted storybook illustration with delicate visible fur and gouache brush texture, believable puppy anatomy and restrained proportions, not a flat vector, emoji, plastic 3D toy or oversized caricature. Warm amber lantern edge-light, soft painterly shading, crafted to harmonize with a cinematic dusk hanok courtyard and warm wooden cafe. Clear compact readable silhouette even at small mobile guide size. One dog only, centered, large in frame with modest safe padding. TRUE TRANSPARENT ALPHA BACKGROUND, no scenery, no floor, no cast shadow outside the silhouette, no text, no lettering, no border, no watermark, no checkerboard.

## 검증 (2026-10-12)

- PNG 1024×1536, 알파 채널 있음. 완전 투명 픽셀 약 47%, 모서리 알파 0 확인.
- 시작 화면 390×844 시각 확인: `screenshots/start-dog-v3.png`.
- Chromium / WebKit 390px 사건 완주·오답·힌트·진행 복원·전이 문제 테스트 2개 통과.
- Capacitor 동기화 및 iPhone Debug 서명 빌드 성공.
- 기존 SVG는 보존. 신규 PNG 약 2.2MB, 초기 JS gzip 14,020 bytes (+11 bytes).
- 연결된 iPhone 13에 `com.mihye.seodang.prototype` 업데이트 설치 및 실행 성공. 실기기 캡처: `screenshots/iphone-dog-v3.png`.
