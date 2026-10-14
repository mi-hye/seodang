## Current learning flow

The prototype supports Korean and Japanese learning with language-specific UI. Stage 0 teaches writing separately from stages 1–7. The learning map supports resume/restart, progress bars, completion screens, and development-only screen navigation.

Japanese stage 0:
- Lessons 1–5: hiragana ranges.
- Lessons 6–7: voiced and semi-voiced sounds, with an animated introduction, writing, and one four-choice question per character.
- Lesson 8: small っ words with illustrations.
- Lesson 9: contracted sound → word pairs, with illustrations and no intermediate questions.
- Lessons 8–9 repeat listening and writing once; lesson 9 practice contains words only. Both show Korean meanings.

Run `npm run check` for unit tests and the production build. Focused WebKit scripts in `scripts/` verify current flows; older narrative prototype checks are not the current acceptance suite. `npm run ios:sync:dev` builds the unlocked development map and screen navigator; `npm run ios:sync` produces the normal build.

The chronological implementation notes below describe earlier iterations and may differ from the current flow above.

# 서당 · 사건 01 웹 프로토타입

현재 UI는 **2026-10-12 Claude 디자인 협업 v2**다. [개편 내용·검증·에셋](docs/design/REDESIGN.md)을 먼저 참고한다. 연결된 iPhone의 서당 체험판에도 v2 설치를 완료했다.

기준: 2026-10-12 `SEODANG_CODEX_HANDOFF.md` v1.0 및 참고 PNG 6장. 문서의 확정 요구를 구현 기준으로 삼고, 수치·기술·정식 미디어는 별도로 구분했다.

기존 Expo 앱과 독립된 모바일 웹 실험이다. 런타임 의존성·로그인·외부 생성 API 없이 동작하며, `prototype/` 이외 운영 코드는 수정하지 않는다.

## 실행

```sh
cd /Users/kangmihye/.codex/worktrees/seodang-playable/seodang/prototype
npm run dev
```

<http://localhost:4173>에서 실행한다. Node 22 이상. 개발 서버는 `0.0.0.0:4173`에서 듣는다. 같은 Wi-Fi의 휴대폰에서는 이 Mac의 LAN IP와 포트 4173을 사용한다. localhost는 접속한 기기 자신이므로 휴대폰에서 그대로 사용하지 않는다. 방화벽 허용 여부는 환경에 따라 다르다. 호스트를 바꾸면 브라우저 저장 공간도 달라진다.

```sh
npm run check             # 구문, 단위 테스트, 정적 산출물
npm ci                   # 브라우저 테스트 도구 설치 시
npx playwright install chromium webkit
npx playwright test      # 모바일 폭별 전체 플레이
```

`npm run build`는 `dist/`에 실제 UI·콘텐츠·에셋만 복사한다. 정적 HTTP 호스팅으로 실행할 수 있다. 참고 PNG·테스트·운영 앱·키 파일은 포함되지 않는다. HTTP 서버가 필요하며 file:// 실행은 지원하지 않는다. 공개 배포와 오프라인 설치 지원은 이번 범위에 포함하지 않았다.

## 실제 흐름

시작(꽃잎·서당개 움직임, 정지 버튼) → 도움 수준 선택 → 홈 → 직원의 의뢰 → 색·위치 표현 → 앞뒤 메모 조사 → 세 가방 중 선택 → 전달 → 손님 반응 → 오른쪽 창문으로 바뀐 방에서 컵 선택 → 정리 → 홈·복습.

- 정답: 창문 옆 파란 가방. 두 메모를 확인해야 전달 성공. 문 옆 파란 가방은 위치, 창문 옆 빨간 가방은 색을 다시 확인한다.
- 노트에는 획득한 단서만 보인다. 번역은 요청 시 펼치고, 힌트는 3단계로 진행한다. 도움에 벌점이 없다.
- 사건 해결과 새 배치 이해 확인을 따로 저장한다. 숙달·가나 전체 학습 완료로 표시하지 않는다.
- 초기화는 확인 대화상자를 거쳐 이 웹 프로토타입 키만 삭제한다. 사건 재시작은 표현 기록·설정을 보존한다.
- 키보드 버튼·dialog 포커스 제한·Escape 닫기·모션 감소·글자 120%·안전 영역을 지원한다.

## 확정 요구와 임시 기본값

| 구분 | 반영 |
| --- | --- |
| 확정 | 모바일 세로·로그인 없음·언어 중심 사건·서당개 안내·간결한 시작 화면·움직임과 정지·교체 가능한 음성 |
| 수용된 방향 | 비주얼 노벨과 터치 조사, 사건 01, 크림 읽기 영역·초록 버튼·노을과 한옥 분위기 |
| 임시 기본값 | 한국어 안내→일본어 학습만 활성화, 약 3–5분, 표현 2개, 이야기/노트/기록 메뉴, 로컬 저장, 글자 크기 100/120% |
| 기술 선택 | 독립 HTML/CSS/ES modules. 작은 고정 콘텐츠에 런타임 프레임워크·게임 엔진 없이 구현. 선택 패널만 동적 import |
| 미정·미완료 | 정식 서당개 외형·표정·말투, 정식 배경, 성우·제작 서비스·녹음, 일본어 문장·발음 검수, 반대 방향 교육과정 |

## 구조와 교체 지점

- `src/content.js`: 안내/학습 언어, 사건·표현·후보·단서·힌트·전이 문항. 초급 분절 표기와 자연 표기 별도.
- `src/engine.js`: 순수 상태 전이·단서 조건·오답·해결·재시도·기록.
- `src/storage.js`: 버전 검사·로컬 저장·격리 초기화. 키는 `seodang.web-prototype.v1`.
- `src/media.js`: 배경·서당개 상태별 매핑, 문장 ID별 오디오 매니페스트 및 재생기.
- `src/ui.js`, `src/app.js`: UI와 탐색, 학습 상태 렌더링.
- `src/panels.js`: 설정·노트·단서·도움·확인 패널. 최초 사용 시 로드.
- `src/style.css`: 모바일 공통 CSS. 패널 CSS도 공통 CSS에 포함하며 지연 로드라고 주장하지 않는다.
- `assets/*-v2.jpg`: 새로 생성한 한옥·카페 배경. `assets/dog.svg`와 UI의 가방 SVG는 임시 캐릭터·오브젝트. 정식 승인 전임을 기록 화면에 안내한다.
- `references/`: 원본 시안 보관. 실제 앱은 이 이미지를 화면으로 띄우거나 투명 버튼을 덮지 않는다.

### 미디어 인계

정식 한옥 배경은 `assets.hanok.src`, 카페 배경은 `assets.cafe.src`를 교체한다. PNG/WebP/SVG 경로를 사용할 수 있다. 서당개 `idle/explain/listen/think/encourage/celebrate` 슬롯은 현재 모두 동일한 임시 SVG를 쓴다. 별도 상태 이미지가 확보되면 각 경로만 교체한다. 최종 일러스트는 시안의 회화적 품질에 맞춰 다시 제작해야 한다.

음성은 모두 `audioFile: null`, `status: missing`이며 듣기 버튼 대신 준비 중을 표시한다. 브라우저 TTS를 호출하지 않는다. 파일 준비 후 `src/media.js`의 문장별 `audioFile`, `productionMethod`, `rightsReviewed`, `languageReviewed`를 기록하고 검수가 끝난 파일을 `status: ready`로 연결한다. 한·일 안내/학습 역할을 구분한다. 재생기는 이전 음성을 중지하고 재생 실패를 화면에 알린다. 현재 연결된 실제 음성은 없으며 자연스러움 검증은 미완료다.

### 저장 복구

새로고침은 홈으로 진입하며 ‘이어서 하기’가 저장한 대사·학습 단계·선택 가방으로 돌아간다. 스키마/콘텐츠 버전이 다르거나 손상되면 원문을 보존하고 임시 세션으로 동작한다. 저장 실패는 진행 중 상태를 유지하며 경고한다. 다른 탭 변경 시 자동 덮어쓰기를 막고 새로고침 안내를 표시한다. 내 학습의 내보내기로 저장 원문을 백업한 뒤 명시적으로 초기화할 수 있다. 자동 마이그레이션·서버 복원·동기화는 제공하지 않는다.

검증 결과는 `TEST_REPORT.md`에 기록한다.

## iPhone 설치형 체험판

`prototype/ios`는 이 웹 프로토타입을 내장하는 Capacitor iOS 앱이다. 앱 이름은 **서당 체험판**, 번들 ID는 `com.mihye.seodang.prototype`이며 기존 운영 앱과 별개다. 웹 파일을 내장하므로 Mac의 개발 서버에 접속하지 않고 시작할 수 있다. 브라우저와 설치형 앱의 학습 기록은 별도 저장 공간을 사용한다.

```sh
npm run ios:sync
npm run ios:open
```

Xcode의 App 스킴에서 연결 기기를 선택해 실행한다. 로컬 개발용 서명은 해당 개발 계정에 의존한다. 웹 소스 변경 후 반드시 `npm run ios:sync`와 Xcode 재빌드를 실행해야 기기에 반영된다. `ios/DerivedData`, 복사된 public, 서명 결과물은 Git에서 제외한다. 구성 방식은 [Capacitor 공식 문서](https://capacitorjs.com/docs/getting-started/environment-setup)를 따른다.


## 3단계 구현 현황 (2026-10-12)

아래 내용은 3단계와 현재 음성에 대한 최신 기록이다. 위 초기 프로토타입 설명의 음성 미연결·단서 노트·서당개 설명은 현재 UI와 다르다.

- 확정 요청: 3단계 구현 시작, 기존 모바일 UI·설정·학습 지도·기록에 연결. 단서 노트와 서당개는 추가하지 않았다.
- 임시 콘텐츠 기본안: **가방 주인을 찾아요**. 소개(これは…です), 위치(…にあります), 부정(…ではありません) 세 문장 → 문장 순서 맞추기 → 위치와 색 단서로 가방 찾기 → 완료. 다음 두 사건은 잠금 상태다.
- 재사용한 실제 자산: `assets/cafe-dusk-v2.jpg`, `assets/word-blue-bag-v1.png`, `assets/word-near-window-v1.png`, 기존 `bag()` SVG. 새 배경·캐릭터·일러스트를 생성하지 않았다.
- 음성: 기존과 같은 VOICEVOX Nemo 女声1 / 10005로 4개 WAV를 생성해 `assets/audio/sentences/`에 내장했다. 소스 문장, 해시, 신호 검사는 해당 폴더의 `lines.json`, `manifest.json`, 크레딧·이용조건은 `NOTICE.txt`에 있다. 원어민 청취 검수는 미완료다. 파일을 같은 경로로 교체하거나 `src/sentence-content.js`의 파일 경로를 수정할 수 있다.
- 3단계 진행은 기존 저장 키의 별도 `sentence` 필드에 저장한다. 이전 기록을 삭제하지 않으며 난이도를 오가도 1·2단계와 각각 이어서 진행한다. 다시 학습해도 완료 이력과 배운 문장은 남는다.
- `src/sentences.js`와 `src/sentences.css`는 3단계 학습/복습을 열 때 로드한다. 새 라이브러리는 추가하지 않았다. 초기 JS gzip 약 21.6KB(이전 19.4KB), 공통 CSS는 동일하며 전용 CSS는 지연 로드한다.
- 검증: `npm test`, `node scripts/check-sentences-browser.mjs`. 상태 전이·오답·저장/복원·난이도 분리·내장 음성 해시를 검사한다. WebKit 실제 UI에서 사건 완료 및 복습까지 검증했다. 320/390/430px, 기본/큰 글씨, 상하 안전 영역 모사로 30가지 레이아웃을 확인했다.

### Level 1 story-first revision (2026-10-13)

Confirmed direction: use an actual story goal before teaching; hear and trace the few letters needed, then use them in the same scene. Keep the three-chapter map and all 46 basic hiragana. Preserve existing learning records, use real UI text/buttons/canvas, and keep bundled audio available offline.

Implemented first story: **아오이의 가방**. Hear あおい, practice あ → お → い, choose the corresponding bag name tag, and return the bag. The first story has no separate alphabet quiz between writing and finding. Labels use only the three taught letters. The bag illustration reuses `assets/word-blue-bag-v1.png`; name tags are live text, not pixels. The existing writing canvas, mnemonic illustrations, and individual character audio are reused.

Provisional curriculum arrangement: 3 / 27 / 16 letters across the three chapters. The other two chapters keep their existing parcel/envelope label stories, now taught and applied in rounds of 3–4 letters. This is an implementation default, not a finalized narrative rewrite of those two chapters. Names, distractor ordering, and the redistribution of letters remain editable in `src/kana-state.js` and `src/kana.js`.

Save format v5 archives v1–v4 source records in `previousCourse`, preserves learned letter IDs and earned completion records, and carries the current letter forward when the new chapter is unlocked. If its new location is locked, the new first story opens without removing previously learned letters. Completed cases can be replayed from the map.

New story cues are bundled in `assets/audio/kana-stories/` with per-file text, hashes, synthesis metadata and NOTICE. Generated with the existing VOICEVOX Nemo 女声1 voice; native-speaker listening review is pending. Replace audio paths through `src/kana-audio.js`. No new illustration or remote API is required to play.

Validation: `npm test`, `node scripts/check-kana-story-browser.mjs`; headless mobile WebKit checks canvas input, name-tag selection, wrong-answer gating, previous/reload/resume, completion persistence, and next chapter. All 46 letters and legacy save migrations are exercised by state tests.

### Learning-only onboarding and stroke order (2026-10-13)

Onboarding now explains only the selected course: the learning goal, listening, practice, and applying clues. Removed the proverb/app-introduction copy and automatic home UI tour. Levels 4–5 clearly state that the selected course is unavailable.

All 46 hiragana now use locally bundled KanjiVG stroke paths and numbers in the writing board. `획순 보기` animates the original ordered paths; writing or leaving cancels the demo without clearing the learner's ink. Reduced-motion users step through highlighted strokes. There is no handwriting grading. The stroke module and data are loaded only in writing practice, retaining the normal glyph as a fallback if data fails to load.

Data: KanjiVG, Ulrich Apel and contributors, CC BY-SA 3.0. Original SVGs, exact commit/URLs, extracted geometry and license notice are in `assets/strokes/`. An expandable source credit is available next to the practice controls. No AI-generated stroke paths are used. Changes affect guidance and display only; learned letters and completion records remain unchanged.

Bundle check for this revision: shared mobile/desktop initial JS gzip 22,918 → 22,623 bytes; initial stylesheet gzip unchanged at 8,937 bytes. Total JS gzip 46,053 → 47,739 bytes. New stroke code and geometry are optional imports/fetches from the writing screen; no client dependency was added.

### Automatic first stroke demonstration (2026-10-13)

Supersedes the manual-first stroke behavior above: on the first appearance of each glyph in the current app session, show its stroke animation once, then enable writing with “따라 써보세요”. During demonstration the canvas does not accept ink; the existing stop control can end the demonstration early. Re-renders do not restart it; the replay button remains available. Existing ink is retained. Reduced-motion settings use the numbered diagram and manual per-stroke highlighting without an automatic animation. No persistent learning progress is reset.

The mascot now explains the general case-based learning loop rather than briefing the Aoi case; the specific story remains on its own case screen. Removed the practice-screen source disclosure. Original KanjiVG copyright headers, `assets/strokes/NOTICE.txt`, source URLs and CC BY-SA license information remain bundled in the app.

### Atomic onboarding guide transition (2026-10-13)

The difficulty-to-guide transition now warms the optional guide module/styles/mascot when difficulty selection opens. It keeps that screen visible while awaiting all assets, including image decoding, mounts the guide while hidden, and changes header/progress/content together. No intermediate loading copy or unstyled guide is shown. Back navigation invalidates pending work; errors stay on the current step and allow retry. The initial language screen still does not load guide assets. Tested delayed JS, CSS, and PNG separately, duplicate submission, back cancellation, and failed image/retry with headless WebKit.

Shared app initial JS gzip remains 22,671 bytes; initial stylesheet remains 8,937 bytes. Total JS gzip changes from 47,986 to 48,193 bytes. Optional onboarding assets remain deferred until difficulty selection.

### 학습 기록 (2026-10-13)
- 원본 앱 `writingActivity.ts`의 기기 현지 날짜 키와 `writingInsights.ts`의 월별 달력 집계 방식을 적용했다. 기록 화면 JS/CSS는 탭 진입 시 지연 로드한다.
- 모든 난이도의 시작한 사건, 배운 항목 수, 완료 여부를 함께 표시하고 해당 난이도로 전환해 이어하기/다시 풀기를 제공한다. 완료 기록은 재시작해도 보존한다.
- 기존 진행은 유지하며 과거 날짜를 추정하지 않는다. 날짜별 학습은 업데이트 이후 글자/표현 학습을 넘기거나 문장 조합을 완료한 횟수(복습 포함), 최초 사건 완료 수를 기기 로컬 저장소에 기록한다. 단순 화면 방문과 설정 변경은 학습 일수에 포함하지 않는다.
- 확정 범위: 현재 구현된 1~3단계 사건의 실제 진행 기록. 임시 기본값: 날짜별 집계 단위는 학습 항목 진행 횟수이며 획수·학습 시간·채점 점수와는 다르다. 기존 앱의 점수/정답률/복습 예약은 해당 데이터가 없으므로 이식하지 않았다.
- 서버 동기화는 없으며 기록 내보내기와 초기화 기능을 유지한다. 과거에 이미 재시작으로 유실된 완료 여부는 복구할 수 없다.

### 경험 중심 가방 사건 / 하단 지도 (2026-10-13)
- 첫 사건은 아오이 → 아키 → 아이, 세 손님에게 가방을 돌려주는 흐름이다. 이름표를 먼저 살펴보고 도움을 선택하면 아오이의 あ·お·い, 다음 손님의 새 글자 き만 듣고 쓴다. 마지막은 배운 あ·い를 직접 읽고 필요할 때만 도움을 펼친다. 정답을 알면 도움 없이 진행할 수 있고, 도움을 보지 않은 글자를 학습 완료로 허위 등록하지 않는다.
- 기존 그림과 획순/쓰기 도구를 재사용한다. 세 이름의 음성은 기존 VOICEVOX Nemo 女声1로 생성해 번들에 넣었다. 원어민 청취 검수는 아직 하지 않았다.
- v7 저장 형식에서 storyRound로 세 손님의 진행을 보존한다. v5/v6 및 이전 진행과 완료 이력은 보존하며 재도전하면 새 세 손님 흐름을 시작한다.
- 배달 상자는 임시 기본값으로 くつ·かさ·はな 세 물건을 사용한다. 기본 46자는 전체 글자 목록에서 중복 없이 유지된다. 세 번째 사건의 남은 글자 구성은 향후 별도 개선 대상이다.
- 공통 하단 내비게이션은 학습 홈 / 학습 지도 / 학습 기록. 홈의 중복 지도 진입 버튼을 제거했으며 배운 항목의 복습 화면 자체는 유지한다.

### 이어받은 작업 / 학습 순서 복구 (2026-10-13)
- 작업 위치: `/Users/kangmihye/.codex/worktrees/seodang-playable/seodang/prototype`, 브랜치 `codex/seodang-playable`.
- 이전 ‘경험 중심 가방 사건’의 선택형 쓰기 도움 흐름을 대체한다. 각 손님은 쓰기 연습 → 이름 읽기 연습 → 가방 선택 검증 순서로 진행한다. 아오이는 あ·お·い, 아키는 새 글자 き, 아이는 배운 あ·い를 다시 쓴다.
- 읽기 화면에서 글자를 연결한 이름과 음성을 확인한다. 검증 중 읽기 도움을 누르면 읽기 연습으로 돌아온다. 오답으로 다음 손님을 열 수 없다.
- `reading` 단계도 저장·복원하며 기존 완료 이력과 배운 글자 기록을 보존한다. 쓰기 도구는 자유 연습이며 필기 정확도 자동 채점은 하지 않는다.
- 학습 홈 카드는 헤더와 하단 탭 사이에서 세로 중앙에 배치한다. 내용이 긴 화면은 스크롤할 수 있다.
- 검증: `npm test`, `node scripts/check-bag-experience-browser.mjs`, `npm run ios:sync`, Xcode 기기 빌드. 모바일 브라우저 검증은 320×568·390×844에서 진행 순서, 오답 차단, 읽기 재연습, 저장된 완료 기록 및 홈 정렬을 확인한다.
- 결과: 테스트 34/34 통과, 두 모바일 크기 브라우저 검증 통과, iOS `BUILD SUCCEEDED`, 연결된 iPhone 13에 설치 및 실행 완료.
- 번들(gzip, 동일 모바일/데스크톱 진입점): 초기 JS 25,269 → 25,366B, 전체 JS 54,408 → 54,641B, 공통 `style.css` 9,057 → 9,148B. 기존 학습 화면의 동적 import 경계는 유지했다. CSS 수치는 빌드 스크립트가 측정하는 공통 스타일 파일 기준이다.

### 학습 목적과 카드 확인 (2026-10-13)
- 사용자 확정 방향: 가방 찾기는 글자 학습을 위한 가벼운 맥락이다. 실제 목표는 글자 쓰기·읽기 연습이며, 사건을 상세하게 설명할 필요는 없다. 이후 화면과 콘텐츠도 학습 목표를 먼저 표현한다.
- 첫 학습 제목을 ‘이름표 글자 연습’으로 바꾸고 홈·학습 지도·도입·완료 문구를 학습 중심으로 수정했다.
- 검증은 이름 카드와 일본어 글자 카드의 짝 맞추기로 바꿨다. 이름을 듣고 카드를 선택하며, 정답은 연결 표시·체크·읽는 법으로 확인한다. 드래그 없이 탭으로 조작한다.
- 쓰기 → 읽기 → 검증 순서와 기존 진행 저장은 유지한다.

### 히라가나 전체를 세 학습으로 분할 (2026-10-13, 최신 기준)
- 사용자 확정: 기본 46자를 표준 순서대로 세 학습으로 나눈다. 1학습은 あ〜そ 15자(あ·か·さ행), 2학습은 た〜ほ 15자(た·な·は행), 3학습은 ま〜ん 16자(ま·や·ら·わ행과 ん)다.
- 각 행에서 쓰기 → 읽기 → 소리/글자 카드 짝 맞추기를 반복한다. 3~5자씩 연습하며, 모든 글자의 카드를 확인해야 다음 묶음으로 이동한다. 학습 제목·홈·지도·안내에서 범위와 1/3, 2/3, 3/3 구간을 보여준다. 사건 이야기나 이름표 중심 내용은 이 구성으로 대체한다.
- v8 저장 형식은 v1~v7 원본을 `kana.previousCourse`에 보관하고 배운 글자·일별 기록을 유지한다. 늘어난 새 학습은 처음부터 연습하며, 이전 완료와 새 학습 완료를 구분해 과거 가방 학습 완료가 15자 학습 완료로 잘못 표시되지 않게 했다.
- 현재 학습 화면은 기존 동적 import를 유지한다. 단일 글자 음성·획순·쓰기·기억 그림을 재사용하며 새 외부 음성 요청이 없다.
- 검증 명령: `npm test`, `node scripts/check-kana-thirds-browser.mjs`, `npm run ios:sync`, Xcode 기기 빌드. 예전 `check-bag-experience-browser.mjs`도 새 검증으로 연결된다.
- 최종 결과: 단위 테스트 32개 통과, 390×844에서 전체 46자의 쓰기·읽기·카드 확인 및 3개 학습 완료·저장·재진입 통과. 320×568과 글자 1.2배에서 첫 행 진행·가로 넘침 검증 통과. `check-kana-migration-browser.mjs`로 v7 원본·배운 글자·이전 완료 보존, 새 학습 잠금, SVG 기억 그림 로드를 확인했다.
- 번들(gzip, 공통 모바일/데스크톱 진입점): 초기 JS 25,384 → 23,658B, 전체 JS 54,528 → 52,199B, 공통 style.css 9,148 → 9,240B. 학습 JS/CSS 동적 로딩을 유지했다. 초기 JS 목록에서 더 이상 정적 import하지 않는 bag-story.js를 제외했다.

### 글자·발음 직접 연결 (2026-10-13, 최신 확인 방식)
- 각 묶음의 3~5개 글자와 발음을 두 열에 모두 펼친다. 발음 순서는 섞어 두고, 손가락/마우스로 한 카드에서 반대쪽 카드까지 끌어 선을 연결한다. 두 카드를 차례로 누르거나 키보드로 선택할 수도 있다.
- 정답 연결은 색 있는 선과 체크로 남으며, 이미 연결한 카드는 고정된다. 오답은 선을 남기지 않고 다시 시도한다. 모든 짝을 연결한 뒤 다음 묶음으로 진행한다.
- 중간 연결은 저장되며 다시 읽기 연습을 해도 유지된다. 기존 v8의 한 글자씩 선택하던 검증 기록은 이미 답한 글자를 연결된 상태로 옮긴다. 15·15·16자 구성과 쓰기 → 읽기 → 검증 순서는 유지한다.
- 연결 모듈은 기존 kana 화면 내부에서만 로드하고 추가 패키지는 쓰지 않는다. `node scripts/check-kana-connections-browser.mjs`로 드래그·오답·취소·저장 복원·반대 방향·키보드·터치·크기 변경을 확인한다.
- 검증 결과: 단위 테스트 34개, WebKit의 작은 화면·기본 화면·글자 1.2배·마지막 3개 짝 연결 검증 통과. 양방향 드래그, 오답, 포인터 취소, 키보드, 두 번 탭, 중간 저장 복원, 화면 크기 변경을 확인했고 Chromium 브라우저 입력으로 실제 터치 드래그도 통과했다.
- 번들(gzip): 초기 JS 23,658 → 24,057B, 전체 JS 52,199 → 54,534B, 공통 style.css 9,240B 유지. 새 연결 코드와 연결 스타일은 kana 화면의 지연 로딩 안에 있다.

### 연결 화면 문구 정리 (2026-10-13)
- 연결 화면에서 상단 학습 범위·진행 숫자, 연결 방법 설명, 글자/발음 열 제목, 하단 보조 설명과 눈에 보이는 정답·오답 피드백 문구를 제거했다.
- 제목, 양쪽 카드와 연결선, 모든 짝을 맞춘 뒤 나오는 다음 버튼만 표시한다. 스크린리더용 연결 결과 안내는 화면에 표시하지 않는다.

### 학습 도입 세로 정렬 (2026-10-13)
- ‘5글자를 쓰고 읽어 봐요’ 도입 화면은 글자·발음·안내·시작 버튼을 헤더 아래 사용 가능 영역의 세로 가운데에 배치한다. 기기 하단 안전 영역을 제외하며 다른 학습 화면 레이아웃에는 적용하지 않는다.
- 320×568, 390×844와 글자 1.2배, 상단 47px·하단 34px 안전 영역에서 중앙 위치·가로 넘침·쓰기 화면 전환을 확인했다.

### 난이도 2 — 메모와 가방 위치 명확화 (2026-10-13)
- 사용자 피드백: 메모의 목적이 불분명하고 정답인 파란 가방이 창문 옆보다 바닥에 있는 것으로 보였다.
- 앞면/뒷면으로 숨겨 둔 단서 버튼을 한 장의 ‘손님이 찾는 가방’ 요청으로 바꿨다. 색 `あおい かばん`, 위치 `まどの そば`를 동시에 표시한다. 표현을 누르면 뜻을 다시 볼 수 있지만, 이를 누르는 행위는 정답 제출의 선행 조건이 아니다.
- 조사 장면은 창문 아래 두 벤치(빨간 가방·파란 가방)와 출입문 옆 벤치(파란 가방)를 직접 배치한 코드 기반 장면이다. 모든 가방이 좌석 위에 보이도록 하고, 사진 위 바닥 좌표에 떠 있던 가방 배치는 제거했다. 정답과 색/위치 오답 피드백은 유지한다.
- 학습 안내도 두 표현 익히기 → 메모와 맞는 가방 고르기로 줄였다. 기존 진행·선택·완료 기록과 음성은 유지한다.
- 검증: `npm test` 34개와 `node scripts/check-level2-request-browser.mjs` 통과. 320×568·390×844·큰 글씨에서 메모 두 표현, 단서 클릭 없이 제출, 색/위치 오답, 선택 저장·복원, 전이 문제 및 학습 완료를 확인했다.
- 번들(gzip): 초기 JS 24,057 → 23,909B, 전체 JS 54,395 → 54,252B, 공통 style.css 9,240 → 10,226B. 추가 패키지·이미지 다운로드 없이 기존 가방 SVG와 CSS로 구성했다.

### 사진 복원 / 가방 색 위치 교체 (2026-10-13, 사용자 정정)
- 코드로 만든 창문·벤치 그림을 제거하고 원래 `assets/cafe-dusk-v2.jpg` 카페 사진을 복원했다. 사진 자체를 새로 생성하거나 편집하지 않았다.
- 원래 창가 빨간 가방 자리에는 정답인 파란 가방을, 원래 아래쪽 파란 가방 자리에는 빨간 가방을 배치했다. 문 옆 파란 가방은 유지한다.
- 가운데 빨간 가방은 이제 창가 정답 위치가 아니므로 오답 문구에서 ‘위치는 맞아요’를 제거했다. 한 장으로 정리한 메모는 유지한다.

### 2026-10-13 · 46자 이후 그림 이름표 학습
- 현재 히라가나 3학습을 모두 완료하면 `그림에 이름표 붙이기`가 열립니다. 마지막 완료 화면, 1단계 홈, 학습 지도, 기록에서 진입할 수 있습니다. 이전 버전의 일부 글자 완료 기록만으로는 열리지 않습니다.
- `かさ` 우산 → `くつ` 신발 → `はな` 꽃 → `ねこ` 고양이: 그림과 단어 읽기/듣기 → 글자 카드로 단어 만들기 → 네 그림과 이름표를 직접 선으로 연결하기. 도입은 “이름표가 섞였어요”와 학습 목적만 설명합니다.
- `labels-state.js`가 단계/조합/연결/완료 기록을 저장합니다. 틀린 연결, 중복 카드, 미완성 상태의 다음 단계 이동을 막고 재학습해도 완료 기록을 유지합니다. 학습 달력에는 단어 연습을 표현 연습으로 집계합니다.
- `assets/labels/*.svg`: 이 학습을 위해 만든 원본 벡터 그림. `assets/audio/labels/*`: 기존과 같은 VOICEVOX Nemo 女声1 음성. 생성 입력은 `scripts/labels-lines.json`, 재생성 스크립트는 `scripts/generate-labels-audio.py`. 원어민 청취 검수는 미완료입니다.
- 화면 JS와 CSS는 진입 시 동적으로 로드합니다. 공통 상태/진입 연결만 초기 코드에 포함합니다. 동일 모바일/데스크톱 엔트리 gzip: 초기 JS 23,820 → 25,604 B, 전체 JS 54,163 → 57,796 B, 공통 CSS 9,510 B 유지. 전체 CSS gzip은 19,900 → 20,561 B이며, 추가 labels CSS 661 B는 지연 로드하고 기존 kana CSS를 재사용합니다.
- 검증: 단위 테스트 37개 통과. `check-labels-browser.mjs`에서 모바일 WebKit 320/390px 및 글씨 1.2배의 단어 조합, 오류 수정, 직접 선 잇기, 저장/재개, 기록/재학습을 확인했습니다. `check-kana-connections-browser.mjs`에서 기존 연결 동작 및 Chromium 실제 터치 드래그도 통과했습니다.
- `check-kana-thirds-browser.mjs`: 46자 전체 쓰기/읽기/연결, 마지막 이름표 진입 버튼, 기록 재개까지 통과. 모바일 연결 입력은 실제 터치 탭을 사용합니다.
- iOS Debug 빌드 성공, ミヘ iPhone13에 설치 완료. 설치 후 자동 실행은 기기 잠금으로 거절되어 실기기 화면 실행 확인은 하지 못했습니다.

### 2026-10-13 · 개발 모드 학습 지도 잠금 해제
- `npm run dev`, `npm run build:dev`, `npm run ios:sync:dev`에서는 구현된 히라가나 3학습과 그림 이름표 학습을 앞 학습 완료 여부와 관계없이 열 수 있습니다. 준비 중인 미구현 학습은 실행되지 않으며 개발 지도에서는 자물쇠 아이콘을 표시하지 않습니다.
- 일반 `npm run build` / `npm run ios:sync`는 순차 학습 규칙을 유지합니다. `src/build-config.js`의 기본값은 false이고, 개발 빌드 출력에서만 true로 생성합니다. 이후 개발용 아이폰 업데이트에는 `ios:sync:dev`를 사용하세요.
- 개발 진입으로 앞 학습의 완료/점수 기록을 만들지 않습니다. 건너뛴 글자 학습은 `practiceAccess`를 저장하여 재개할 수 있으며, 일반 빌드로 돌아오면 앞선 미완료 학습으로 진입하되 개발 중의 실제 학습 기록은 보존합니다.
- 검증: 기존 37개 테스트, 개발 출력의 모바일 WebKit 지도 전체 해제/3학습 바로 열기/이름표 바로 열기/재개/일반 빌드 기록 호환 검사 통과. 초기 JS gzip 25,604 → 25,832 B(개발), 전체 JS 57,796 → 58,065 B. 공통 CSS 9,510 B 및 전체 CSS 20,561 B 유지.

### 2026-10-13 · 이름표 그림을 사진 스타일로 교체
- 사용자 요청에 따라 우산/신발/꽃/고양이 벡터 그림을 사진처럼 사실적인 이미지로 교체했습니다. 읽기, 단어 조합, 선 잇기, 소개/완료 화면에서 같은 사진을 사용합니다.
- 생성: built-in `image_gen`. 생성 사진이며 실제 촬영물은 아닙니다. 이미지별 최종 프롬프트와 파일 경로: `assets/labels/photo-prompts.json`. 원본: `outputs/label-photos/*-photo-v1.png`. 앱용: `assets/labels/{kasa,kutsu,hana,neko}-photo-v1.jpg` (640px JPEG).
- 사진은 잘리지 않게 표시하며 선 잇기/저장/개발 모드의 학습 지도 잠금 해제 동작은 유지합니다. 모바일 320/390px 및 큰 글씨 설정에서 확인합니다.

### 2026-10-13 · 단어 조합 확인을 한 번으로
- 단어 조합에서 정답을 `확인`하면 바로 다음 단어 읽기로, 네 번째 정답이면 그림·이름표 연결로 이동합니다. 정답 후 `다음 단어`/`이름표 붙이기`를 다시 누르는 중간 화면은 제거했습니다.
- 오답은 현재 화면에서 수정합니다. 이전 버전의 정답 확인 상태 저장도 `확인` 한 번으로 계속할 수 있고, 표현 연습은 한 번만 기록합니다. 확인/다음 연속 입력 방지와 다음 단어 음성 재생도 유지합니다.
- 단위 테스트 38개 통과. 모바일 브라우저 검사에서 정답 확인 직후의 다음 화면을 직접 검증합니다.

### 2026-10-13 · 학습 기록 화면 간소화
- 사용자 요청으로 `학습별 기록` 목록과 각 학습의 재개 버튼을 제거했습니다. 완료한 학습 수, 학습한 날, 달력/날짜별 기록, 기록 관리는 유지합니다. 저장된 학습 데이터는 삭제하지 않습니다.
- 사용하지 않는 목록 데이터 계산·스타일·`record-open` 핸들러를 제거했습니다. 학습 재개는 홈/학습 지도에서 합니다.
- 기존 테스트 38개 및 모바일 WebKit 320/390px/큰 글씨의 달력 이동·기록 보존·목록 제거 확인 통과. iOS 개발 빌드 성공.

### 2026-10-13 · 글자 카드를 다시 눌러 선택 취소
- 이름표 단어 만들기의 `한 글자 지우기` 버튼을 제거했습니다. 선택한 아래 글자 카드를 다시 누르거나 위에 놓인 글자를 누르면 해당 칸만 비워집니다. 다른 칸의 글자는 이동하지 않으며 다음 선택은 첫 빈칸을 채웁니다.
- 선택 카드에 선택 상태를 표시하고, 빈칸이 있으면 확인 버튼을 비활성화합니다. 빈칸을 포함한 진행도 저장할 수 있습니다. 기존 정답 확인 상태의 저장 데이터에서도 글자를 다시 선택/취소할 수 있습니다.
- 기존 단위 테스트에 선택 취소와 중간 빈칸 동작을 반영해 38개 통과. 모바일 브라우저에서 두 방식의 제거 및 한 번 확인 이동을 확인합니다.

### 2026-10-13 · 이름표 완료 후 다음 학습으로 바로 이동
- 마지막 그림·이름표 연결이 맞으면 완료 화면과 `학습 마치기` 버튼 없이 다음 구현 학습인 2단계 색·위치 표현(카페 가방)으로 바로 이동합니다.
- 이름표 완료 기록과 다음 학습의 시작 상태를 함께 저장합니다. 다음 학습의 진행 중 기록은 이어가며, 이미 끝난 경우 재학습합니다. 이전 버전의 연결 4개 완료 대기 저장과 완료 화면 저장도 이어서 사용할 수 있습니다.
- 단위 테스트 39개 및 모바일 WebKit 320/390px/큰 글씨 검사 통과: 마지막 연결 직후 다음 학습 표시, 완료 기록, 새로고침 후 2단계 유지 확인.

### 2026-10-13 · 다음 학습은 1단계 안에서 계속
- 직전의 2단계 자동 이동은 잘못된 해석으로 철회했습니다. 이름표 붙이기 다음은 **1단계 · 듣고 사진 고르기**입니다. 마지막 연결이 맞으면 완료 화면 없이 바로 듣기 문제를 시작하고 난이도는 1단계를 유지합니다. 2단계 가방 학습의 데이터는 변경하지 않습니다.
- 배운 네 단어의 기존 사진·음성을 재사용합니다. 단어를 듣고 네 사진 중 하나를 고르며 정답이면 다음 문제, 오답이면 다시 듣고 선택합니다. 네 문제 완료 후에는 완료 문구 없이 1단계 학습 지도로 돌아갑니다. 홈/지도에서 재개·재학습할 수 있고 개발 모드에서는 바로 열립니다.
- 이전 잘못된 빌드로 이름표 완료 후 2단계로 이동한 기록은 새 듣기 기록이 없을 때 한 번만 1단계로 복구합니다. 새 듣기 기록이 생긴 이후 사용자가 직접 선택한 난이도는 유지합니다.
- 단위 테스트 40개, 모바일 320/390px 및 큰 글씨에서 마지막 이름표 → 듣기 문제 → 저장/재개 → 지도 완료 확인 통과. 초기 JS gzip 26,973 B, 전체 JS 58,632 B, 공통 CSS 9,510 B. 듣기 화면은 기존 labels 화면과 함께 지연 로드합니다.

### 2026-10-13 · 3단계 문장 만들기 버튼 정리
- `다시 고르기`를 제거하고 `이전` / `확인`을 같은 줄에 배치했습니다. 정답 확인 뒤에는 같은 위치에 `이전` / `다음`이 표시됩니다. 선택한 문장 조각을 다시 눌러 빼는 기능은 유지합니다.
- 기존 문장 학습 브라우저 검사를 변경된 조작에 맞췄습니다. 320/390px에서 두 버튼의 가로 배치, 문장 조각 제거·오답 수정, 저장/재개 및 전체 학습을 확인합니다.

### 2026-10-13 · 3단계 완료 버튼 정리 및 4단계 일상 대화
- 3단계 완료 화면의 `배운 문장 보기` 버튼을 제거했습니다.
- **4단계 · 카페에서 주문하기** 추가: 커피 한 잔 주문 → 따뜻한 음료 선택 → 포장 요청. 직원 질문/나의 답과 뜻을 익힌 뒤, 목표 주문에 맞는 답을 선택하고 `확인` 한 번으로 진행합니다. 오답은 현재 질문에서 다시 고릅니다. 마지막 정답 후 완료 문구 없이 4단계 지도로 돌아갑니다.
- 난이도 설정·온보딩·홈·학습 지도에서 진입합니다. 3단계에서 난이도를 자동 변경하지 않습니다. 다른 난이도와 분리된 `dialogue` 진행 상태를 저장하고 완료/날짜 기록을 유지합니다.
- UI와 CSS 및 대화 콘텐츠는 진입 시 지연 로드합니다. 공통 코드에는 작은 상태 모듈만 추가. 개발 빌드 초기 JS gzip 28,325 B, 전체 JS 62,013 B, 공통 CSS 9,510 B.
- 음성 6개는 기존 VOICEVOX Nemo 女声1로 생성해 `assets/audio/dialogue/`에 내장했습니다. 생성 입력 `scripts/dialogue-lines.json`, 스크립트 `scripts/generate-dialogue-audio.py`, 출처/해시는 해당 폴더 NOTICE/manifest. 원어민 청취 검수는 미완료입니다.
- 단위 테스트 42개 통과: 4단계 이전/다음·오답/정답·저장/복원·난이도 분리·완료 중복 방지·음성 해시 검사 포함.
- 모바일 WebKit 320px/390px/큰 글씨에서 4단계 전체 학습·오답 수정·중간 저장/재개·음성 호출·기록·재학습·난이도 전환 통과. 3단계 전체 학습도 완료 화면 버튼 제거 후 재검증 통과. iOS 개발 빌드 및 Wi-Fi 설치 완료; 기기 잠금으로 자동 실행은 거절되었습니다.

### 2026-10-13 · 버튼 두 개는 항상 flex 가로 배치
- 사용자 공통 규칙: 두 액션 버튼은 `display:flex; flex-direction:row; flex-wrap:nowrap`로 나란히 배치합니다. 공유 `.button-pair`를 적용하고 버튼의 개별 너비/여백이 줄바꿈이나 높이 차이를 만들지 않게 정리했습니다.
- 글자 이전/다음·완료, 2단계 이전/다음·완료, 3단계 익히기/만들기/가방 선택/완료, 4단계 대화, 힌트/재시작 팝업, 기록 관리에 적용했습니다. 앞으로의 구현 규칙은 `AGENTS.md`에 명시했습니다.
- 모바일 WebKit에서 320px 기본/큰 글씨, 390px의 11개 화면별 그룹을 확인: 계산된 display:flex/row/nowrap, 동일 y좌표/높이, 버튼 겹침과 가로 넘침 없음. iOS 개발 빌드 성공.

### 2026-10-13 · 3단계 상단 표시와 플레이스홀더 간소화
- `문장 익히기`, `문장 만들기` 라벨을 제거하고 콘텐츠 우상단에 숫자만 표시합니다. 익히기와 만들기를 연속된 6개 화면으로 세어 1/6 → 6/6으로 진행합니다. 이전처럼 두 화면에서 같은 1/3을 반복하지 않습니다.
- 만들기 화면의 별도 안내 문단을 없애고 답 영역이 비어 있을 때만 `말을 순서대로 골라주세요`를 표시합니다. 글자를 선택하면 플레이스홀더가 사라집니다. 가로 flex 버튼 배치는 유지합니다.

## Korean learning and Japanese interface

Selecting Korean in onboarding or Settings → learning language saves `courseDirection: ja-ko`. Navigation, onboarding, settings, records, and reset confirmation use Japanese; Korean remains the learning material. Switching back restores the Japanese course's level and progress. Korean progress and daily history are stored separately under `state.korean`; the existing `ko-ja` saves remain valid.

The initial Korean course contains ten level-1 lessons (21 vowels, 19 consonants, syllables, final consonants, vocabulary, and greetings) plus one lesson per level 2–7. Letter practice uses a traceable canvas, without claiming handwriting recognition. Level 7 presents audio with no transcript. Eighty-nine Korean WAV files are bundled, generated with the installed macOS Yuna voice; inputs, hashes, durations, and signal checks are in `assets/audio/korean/manifest.json`. Native-speaker listening review remains pending.

Korean content/styles and Japanese UI translations are loaded on demand. Matching development builds: initial shared mobile/desktop JS gzip 35,042 → 39,113 bytes; initial CSS gzip 13,047 → 13,090 bytes; total JS gzip 79,935 → 94,969 bytes. The added initial code covers language selection, state validation, and map metadata; lesson content and translation tables remain optional.

Validation: 52 unit tests; WebKit onboarding, all seven levels, retry/resume, separate course settings/records, Japanese reset cancellation, handwriting, and 320px large-text layout; all 89 WAVs decoded in WebKit; existing Japanese map flow; Debug iOS build.

### Hangul stroke demonstrations

The Korean writing lessons now show numbered, animated centerlines for all 40 taught jamo and the 12 practice syllables in lessons 1-7 and 1-8. Geometry is original; writing-order reference: https://geulssibang.com/hangul/order/. Compound vowels, double consonants, and final consonants are composed in component order. Replay/stop and reduced-motion single-stroke stepping use Japanese labels. Writing is paused during automatic demonstrations and remains unscored practice. The demonstration module and geometry stay in the optional Korean lesson graph; initial JS/CSS gzip are unchanged (39,240 / 13,090 bytes in the development build).

Validated coverage and stroke counts, WebKit automatic drawing, replay/stop, user drawing/erase, reduced-motion stepping, final-consonant rendering, disposal, and narrow layout. 54 unit tests pass.


## Alternating Korean letter learning and composition

Level 1 now alternates five learning lessons and five composition lessons across 1-1–1-10: basic components, remaining basic consonants/y-vowels, tense consonants, compound vowels, and final consonants. All 40 jamo are covered; practice uses only previously taught components. Learners hear a syllable, fill a missing component, and see their choice compose into a Hangul syllable. Ambiguous compound-vowel sounds also have a written cue. Practice starts directly, retries without advancing, and hands off to the next lesson in level 1. Learning lessons retain animated stroke order and tracing.

Korean progress version 2 retains old daily records and levels 2–7. Version-1 letter progress is archived in `legacyLetters`; the reorganized first-level sequence starts at 1-1, so old indices never mark different new content as completed. Audio inputs and all 119 matching bundled Yuna clips were regenerated. Japanese course data remains separate.

Validation: 56 unit tests, WebKit composition handoffs/retry/resume and narrow large-text layout, stroke demonstrations, and Korean course regression. Optional composition UI stays in the lazy Korean module; initial JS gzip is 39,444 bytes in the development build (204 bytes added for metadata/migration); initial CSS stays at 13,090 bytes.

## Japanese vocabulary between sound groups

Lessons 1-7–1-10 now interleave 14 vocabulary items after the sounds they use; 1-6 remains the six-word introduction. Examples include ぎ → かぎ, ぽ → さんぽ, and しゃ → しゃしん. The five lessons contain 41 learn/quiz items in total. Applicable words include kanji/readings; memory tips remain limited to the existing approved associations. All 41 matching WAVs use the existing VOICEVOX Nemo 女声1 voice and verified manifest hashes.

Basic progress version 2 maps old in-progress indices to the same material and clears rotated answer selections. Previously completed expanded lessons reopen at their first new word; existing daily/completion history is preserved. Lesson numbering remains 1-6–1-10.

Validation: 58 unit tests, WebKit all 41 items with automatic handoffs/retry/resume, memory-tip regression, all WAVs decoded, and 320px large-text vocabulary/kanji layout. Development initial JS gzip 39,444 → 39,742 bytes; initial CSS unchanged at 13,090 bytes. Vocabulary, kanji and audio remain in the optional lesson assets. Debug iOS build succeeded; device installation was unavailable (CoreDevice 4016).

## Four rounds of listening, reading, writing and speaking

Every implemented Japanese and Korean lesson now keeps completion pending until its taught items have gone through four rounds of all four activities (16 encounters per item). A small stored progress record tracks round, mode, item and the pending completion action. Correct answers in the original lesson no longer unlock the next lesson before repetition finishes; the original completion/history action runs once at the end. Home resumes pending practice for the selected language and difficulty. Switching lessons/languages retains separate progress, and explicit restart clears only that lesson's pending repetition.

Listening requires successful bundled playback and a correct selection. Reading checks meaning; choices and item order rotate by round. Writing uses a touch canvas with a visible guide in rounds 1–2, then recall and self-comparison in rounds 3–4. Speaking records a short local clip and requires playback; it does not claim pronunciation recognition. Microphone denial/unavailability offers explicit unrecorded spoken practice. Recordings stay ephemeral, are not uploaded, and stop on navigation/backgrounding. iOS uses an AVAudioRecorder bridge with microphone permission, metering, a 35-second limit and temporary-file deletion; the browser uses getUserMedia/MediaRecorder. Full advanced listening scripts remain hidden; repetition uses concise takeaways, with 18 additional bundled recap clips.

Validation: 61 unit tests; WebKit full 96-step six-word repetition, audio-failure gating, wrong answers, actual canvas input, mocked native recorder/replay, microphone-denial fallback, resume, all lesson types' final handoff, Japanese guide and map regression. All 18 new clips decode in WebKit. Physical microphone capture still needs a device speaking check; native Debug compilation and device installation succeeded. Device launch was blocked by the iPhone lock screen.

The screen, recording code, CSS and content load only on lesson entry. Matching development builds: initial JS gzip 39,742 → 41,481 bytes; initial CSS stays 13,090 bytes. Total JS is 111,253 bytes. Initial additions are the app integration and bounded save validation; lesson content and recording stay deferred.

## Beginner visual memory tips

Level-1 word tips now contain only a simple original SVG and one short shape/scene association. Removed kanji blocks, Korean character glosses, and extra related vocabulary. Unsupported/forced tips remain absent. The ち mnemonic and its SVG no longer use 七; they use a cheerleader silhouette. Level 3 introduces only the kanji relevant to its current sentences (私, 窓, 赤い), in a collapsed reading-supported note; answer text and recordings remain unchanged.

Validation: WebKit expanded/collapsed keyboard behavior, SVG loading, no beginner kanji, level-3 ruby reading, quiz separation and 320px large text; 61 unit tests and production build. Initial JS/CSS are unchanged; optional JS decreased from 111,253 to 109,828 gzip bytes in the development build.

## Resume choice and lesson progress

Re-entering an unfinished lesson from home or the map asks whether to continue or start again. Dismissing the dialog changes nothing. Restart resets only that lesson and its pending four-round practice, retaining accumulated history and completed unlocks. Korean replay attempts now resume their current index instead of resetting because an earlier attempt was completed. The header progress bar includes original activities and all 16 repetition passes per item, with accessible percentage semantics. Dialog controls remain horizontal on narrow screens, and both UI languages are supported.

Validation: 63 unit tests, WebKit dialog cancellation/resume/restart, pending repetition restoration, 320px large text and deferred module loading. Initial JS gzip is 41,696 bytes (+215); initial CSS remains 13,090 bytes. The session UI and progress calculations load only on lesson entry.

## Visual dog guide

Replaced the text-heavy multi-page guide with one optional listening example: a small mascot and one instruction, a real bundled clip from the selected course, two answer choices with retry feedback, and four skill icons marked ×4. Level 7 hides the example transcript. Demo choices do not write learning progress; the home button is always available. Playback stops on leaving the guide or backgrounding. Guide content/CSS remain deferred.

Validation: 62 unit tests; WebKit Japanese guide entry/replay, both languages at levels 1/3/7, levels 1–5 onboarding navigation and safe-area CTA, delayed/failing assets, and cancellation. Initial app JS/CSS remain 41,696/13,090 gzip bytes.

## App copy cleanup

Reviewed onboarding, lessons, practice, hints, reviews, records, settings and errors. Shortened prompts and actions; removed repeated lesson introductions, decorative scene captions, scripted success dialogue and extra completion narration. The kana transition into four-round practice now says “다음” instead of claiming the lesson is finished. Core learning text, audio, vocabulary meanings and actionable error guidance remain intact. Korean UI keys and Japanese translations remain aligned. The unreadable-save warning no longer advertises an unavailable export action.

Humanize Korean review: `_workspace/2026-10-14-002-2a8a/`; final editorial check restored the reading lesson’s “이유” objective and pre-history date distinction. Copy shortening raises the sampled change rate to 32.2% (warning), with no unresolved meaning-loss findings after final review. Validation: 62 unit tests; WebKit five learning screens at 320px/large text, both guide languages, guide navigation, resume/restart and repetition progress. No new dependencies or initial CSS.

## Stage 0 and distinct guides

Both directions now have stages 0–7. Stage 0 contains letters and sound combinations; stage 1 contains words, while stages 2–7 keep their numbers. Japanese stage 0 has the three hiragana lessons followed by voiced/semi-voiced sounds, small っ, and contracted sounds with word examples; stage 1 keeps labels, listening, and vocabulary. Korean stage 0 keeps all ten alternating letter/composition lessons; stage 1 adds six everyday words with six bundled Yuna clips. Stable lesson IDs and pending practice keys are retained, including legacy Korean IDs `1-1`…`1-10`; displayed numbers come from stage membership, not those storage IDs.

An idempotent `levelLayoutVersion` migration maps old stage-1 selections and per-language selections to the appropriate new stage without changing lesson, history or practice data. Zero is valid throughout setup, settings, storage and language switching. Completion stays within a stage; the last lesson returns home. Each newly selected stage opens its guide once per language; settings can replay it.

Guides use eight distinct prompts and activities: trace, word/meaning, short expression, sentence arrangement, dialogue response, information reading, conditions/reasons, and audio-only inference. They use the actual course material; stage 7 never renders the transcript. Guides remain deferred and do not write lesson progress. Validation: 65 tests, WebKit all 16 guides with real canvas/arrangement/choice interactions, stage maps/settings and one-time entry, all lesson completion handoffs and unchanged difficulty. Initial app JS gzip 41,621 bytes; initial CSS unchanged at 13,090 bytes.

### 단계별 온보딩

학습 안내는 ‘서당은 이렇게 진행돼요’로 시작하는 세 화면입니다. 선택한 단계의 학습 순서, 실제 학습 예시, 듣기·쓰기·말하기 4바퀴를 보여 줍니다. 문제를 풀지 않고 다음으로 이동할 수 있고, 이전 버튼으로 안내를 다시 볼 수 있습니다. 한국어 학습에는 일본어 안내가 표시되며 7단계 예시는 지문 없이 음성만 제공합니다.

반복 연습의 읽기 선택 문제는 제거했습니다. 듣기 → 쓰기 → 말하기를 4바퀴 진행하며, 이전 읽기 화면의 저장 기록은 같은 바퀴의 쓰기 첫 문제로 이어집니다.

### 개발용 학습 화면 이동

개발 빌드의 학습 화면에는 `< 현재 / 전체 >` 도구가 표시됩니다. 현재 학습의 안내·문제·반복 연습을 순서대로 세며, 정답 입력 없이 앞뒤 화면으로 이동할 수 있습니다. 첫 화면과 마지막 화면에서는 해당 방향 버튼이 비활성화됩니다. 도구로 이동하는 것만으로 저장된 학습 기록을 변경하지 않으며, 일반 빌드에서는 모듈과 스타일을 불러오지 않습니다.

### 히라가나 10글자 묶음

히라가나 46자는 10·10·10·10·6글자의 다섯 학습으로 나눕니다. 한 학습 안에서는 5글자씩 쓰기·읽기·짝 잇기를 진행하고, 마지막 6글자는 3글자씩 다룹니다. 반복 연습은 해당 학습 글자만 사용합니다. 개발 도구 기준 첫 학습은 144화면입니다. 이전 15·15·16글자 과정은 보관하며, 글자 전부를 완료한 새 묶음에만 완료를 적용합니다. 진행 중 반복 연습은 `previousKanaPractices`에 보관하고 새 묶음에서 다시 시작합니다.

반복 연습은 듣기 → 쓰기 → 말하기를 3바퀴 진행합니다. 히라가나 첫 학습은 개발 도구 기준 114화면이며, 온보딩과 진행률에도 세 바퀴를 적용합니다. 이전 네 번째 바퀴 기록은 세 번째 바퀴의 마지막 말하기로 이어집니다.

말하기 연습은 녹음 없이 소리 내어 읽고 다음으로 이동합니다. 녹음·내 목소리 재생 버튼과 웹/iOS 녹음 구현, 마이크 사용 권한 설명을 제거했습니다.
