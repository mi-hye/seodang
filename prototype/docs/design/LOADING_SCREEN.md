# index 로딩 화면

- 실제 사용: 제공 references/01_start_hanok.png에서 시작하기 버튼만 제거하도록 내장 imagegen 편집. 원본 보존, 파생 파일 assets/start-loading.png 사용. 배경에 들어간 제목은 그대로 이미지 요소.
- 실제 UI: 안전 영역 안의 로딩바, 진행률, 상태 문구, 실패 시 재시도 버튼. 시작하기 버튼/클릭 영역 제거.
- 진행률은 배경 decode와 온보딩 HTML/CSS/JS 의존성 및 사용 이미지 준비 8개 작업 중 완료 수 비율. 바이트 단위 비율은 아님. 인위적인 진행 타이머 없음. 모두 준비되면 setup.html로 replace 이동.
- 15초 초과/누락 파일 오류 시 자동 이동하지 않고 재시도 제공.
- 온보딩 첫 단계의 뒤로 버튼을 숨겨 로딩→온보딩 반복 방지. 나머지 단계 뒤로 유지.
- Node VM에서 완료/실패/재시도/진행률/화면 이동 검증. iOS 서명 빌드 성공. 로컬 브라우저 미실행.

## 최종 편집 프롬프트 (내장 imagegen)

Edit this supplied image with ONE narrowly scoped change only: remove the green pill-shaped '시작하기' button and its white arrow, located in the sky beneath the large 서당 title. Fill ONLY that button region with a seamless continuation of the immediately surrounding peach-gold sky/cloud texture. Preserve everything else exactly: the 서당 calligraphic title and flourish, original composition, architecture, blossoms, sleeping cat, lanterns, distant tower, staircase, lighting, colors, framing and dimensions. Do not redesign, add any elements, add text, or add a loading indicator. This is removal of baked-in UI from the original asset, not a new background illustration. Output same portrait composition.

## 구 시작 화면 제거

playable 앱에 남아 있던 start/onboarding 렌더러와 배경 움직임 재생·정지 버튼 제거. 이 버튼은 음악이 아닌 꽃잎 애니메이션 제어용이었다. 초기화 및 미설정 상태의 직접 진입은 index 로딩 화면으로 연결. 로딩 후 기기 설정 완료 사용자는 학습 홈, 최초 사용자는 setup으로 이동. 실제 목적지별 자산을 준비. 로딩에는 별도 서당개 이미지 없음(원본 배경 고양이는 유지).
Node 테스트 7개와 첫 실행/재방문 목적지 분기, 레거시 요소 제거 확인. iOS 서명 빌드. 로컬 브라우저 미실행.
