# React Native + Expo 프로젝트 구조 및 타입 설계 초안

## 1. 문서 목적

이 문서는 한자 쓰기 학습 앱 MVP를 실제 코드로 옮기기 위한 기술 구조 초안이다.
목표는 다음과 같다.

- 프로젝트 폴더 구조를 단순하게 정한다.
- 화면, 상태, 데이터, 로직의 책임을 나눈다.
- 주니어 개발자가 유지 가능한 수준의 구조를 유지한다.

초기 MVP는 "과도한 아키텍처"보다 "책임이 분리된 단순 구조"를 목표로 한다.

## 2. 권장 스택

- React Native
- Expo
- TypeScript
- Expo Router
- Zustand
- React Query는 초기 MVP에서는 생략 가능
- SQLite 또는 AsyncStorage

로컬 우선 구조를 추천한다. 서버는 AI 기능 또는 계정 동기화가 필요해질 때 추가한다.

## 3. 디렉터리 구조 제안

```text
seodang/
├─ app/
│  ├─ _layout.tsx
│  ├─ index.tsx
│  ├─ list.tsx
│  ├─ character/
│  │  └─ [characterId].tsx
│  ├─ practice/
│  │  ├─ [characterId].tsx
│  │  └─ result.tsx
│  └─ review.tsx
├─ src/
│  ├─ components/
│  │  ├─ common/
│  │  ├─ character/
│  │  └─ practice/
│  ├─ features/
│  │  ├─ character-list/
│  │  ├─ character-detail/
│  │  ├─ practice-session/
│  │  ├─ practice-result/
│  │  └─ review/
│  ├─ stores/
│  │  ├─ settings-store.ts
│  │  ├─ progress-store.ts
│  │  └─ practice-store.ts
│  ├─ domain/
│  │  ├─ models/
│  │  ├─ practice/
│  │  └─ review/
│  ├─ services/
│  │  ├─ content-service.ts
│  │  ├─ progress-service.ts
│  │  └─ storage-service.ts
│  ├─ data/
│  │  ├─ characters/
│  │  └─ strokes/
│  ├─ constants/
│  ├─ utils/
│  ├─ hooks/
│  └─ types/
├─ assets/
├─ docs/
└─ README.md
```

## 4. 구조 원칙

### `app/`

- 라우팅 엔트리만 둔다.
- 화면에서 필요한 feature 컴포넌트를 조합한다.
- 비즈니스 로직을 많이 넣지 않는다.

### `src/features/`

- 화면별 기능 단위를 둔다.
- 각 기능에서 필요한 UI, hooks, helper를 함께 둘 수 있다.

### `src/domain/`

- 앱 핵심 규칙을 둔다.
- 한자 데이터 모델, 쓰기 판정 로직, 복습 우선순위 계산이 여기에 들어간다.

### `src/stores/`

- 전역 상태를 둔다.
- 화면 UI 상태 전체를 다 넣지 말고, 공유가 필요한 상태만 넣는다.

### `src/services/`

- 저장소 접근
- 데이터 로딩
- 나중의 API 연동

### `src/data/`

- 샘플 JSON
- 번들에 포함되는 로컬 콘텐츠

## 5. 라우팅 구조 제안

Expo Router 기준 최소 구조:

```text
app/
├─ _layout.tsx
├─ index.tsx
├─ list.tsx
├─ review.tsx
├─ character/
│  └─ [characterId].tsx
└─ practice/
   ├─ [characterId].tsx
   └─ result.tsx
```

### 라우트 역할

- `index.tsx`: 홈
- `list.tsx`: 한자 목록
- `review.tsx`: 복습 목록
- `character/[characterId].tsx`: 한자 상세
- `practice/[characterId].tsx`: 쓰기 연습
- `practice/result.tsx`: 결과 화면

## 6. 타입 설계 초안

### 공통 타입

```ts
export type UserType = "korean_learner" | "japanese_learner";

export type LearningTrack = "grade" | "jlpt" | "theme";

export type ProgressStatus =
  | "not_started"
  | "in_progress"
  | "needs_review"
  | "mastered";
```

### 콘텐츠 타입

```ts
export type CharacterId = string;

export type Example = {
  id: string;
  word: string;
  reading: string;
  meaningKo?: string;
  meaningJa?: string;
};

export type Character = {
  id: CharacterId;
  literal: string;
  meaningKo?: string;
  meaningJa?: string;
  onyomi: string[];
  kunyomi: string[];
  strokeCount: number;
  radical?: string;
  grade?: number;
  jlptLevel?: "N5" | "N4" | "N3" | "N2" | "N1";
  tags?: string[];
  examples: Example[];
  strokeDataId: string;
};
```

### stroke 타입

```ts
export type Point = {
  x: number;
  y: number;
  t?: number;
};

export type StrokePath = {
  order: number;
  points: Point[];
};

export type StrokeData = {
  id: string;
  characterId: CharacterId;
  strokes: StrokePath[];
};
```

### 사용자 입력 타입

```ts
export type InputStroke = {
  order: number;
  points: Point[];
};

export type PracticeInput = {
  characterId: CharacterId;
  strokes: InputStroke[];
  startedAt: string;
  submittedAt?: string;
};
```

### 판정 결과 타입

```ts
export type StrokeFeedback = {
  strokeOrder: number;
  passed: boolean;
  reason?: "wrong_order" | "bad_start" | "bad_end" | "shape_mismatch";
  score: number;
};

export type PracticeEvaluation = {
  characterId: CharacterId;
  passed: boolean;
  score: number;
  feedback: StrokeFeedback[];
  summaryMessage: string;
};
```

### 학습 기록 타입

```ts
export type PracticeAttempt = {
  id: string;
  characterId: CharacterId;
  createdAt: string;
  durationMs: number;
  score: number;
  passed: boolean;
  userType: UserType;
};

export type CharacterProgress = {
  characterId: CharacterId;
  attempts: number;
  successes: number;
  failures: number;
  averageScore: number;
  status: ProgressStatus;
  lastPracticedAt?: string;
  nextReviewAt?: string;
};
```

## 7. 스토어 설계 초안

초기에는 Zustand 스토어를 3개로 제한한다.

### 1. `settings-store`

역할:

- 사용자 타입 저장
- 언어 및 학습 트랙 저장
- 기본 환경설정 저장

예시:

```ts
type SettingsState = {
  userType: UserType;
  learningTrack: LearningTrack;
  setUserType: (userType: UserType) => void;
  setLearningTrack: (track: LearningTrack) => void;
};
```

### 2. `practice-store`

역할:

- 현재 쓰기 세션 상태 관리
- 입력 stroke 목록 저장
- 세션 시작/초기화/제출

예시:

```ts
type PracticeSessionState = {
  currentCharacterId?: string;
  inputStrokes: InputStroke[];
  startedAt?: string;
  isHintVisible: boolean;
  startSession: (characterId: string) => void;
  addStroke: (stroke: InputStroke) => void;
  resetSession: () => void;
  toggleHint: () => void;
};
```

### 3. `progress-store`

역할:

- 학습 기록 반영
- 복습 목록 계산
- 홈 화면용 요약 데이터 제공

예시:

```ts
type ProgressState = {
  attempts: PracticeAttempt[];
  progressByCharacter: Record<string, CharacterProgress>;
  recordAttempt: (
    attempt: PracticeAttempt,
    evaluation: PracticeEvaluation,
  ) => void;
  getReviewItems: () => CharacterProgress[];
};
```

## 8. 서비스 계층 설계

### `content-service.ts`

역할:

- 한자 목록 가져오기
- 한자 상세 가져오기
- 필터 적용

초기 구현:

- 로컬 JSON 사용

나중 확장:

- SQLite
- 원격 API

### `progress-service.ts`

역할:

- 시도 결과를 저장소에 반영
- 복습 우선순위 계산
- 홈 요약값 계산

### `storage-service.ts`

역할:

- AsyncStorage 또는 SQLite 접근 추상화

주의:

- 너무 이른 시점에 범용 Repository 패턴으로 복잡하게 만들지 않는다.

## 9. 도메인 로직 분리

핵심 로직은 컴포넌트 바깥에 둔다.

예:

```text
src/domain/practice/
├─ evaluate-practice.ts
├─ compare-stroke-order.ts
├─ compare-stroke-start-end.ts
└─ build-feedback-message.ts
```

이유:

- 테스트가 쉬워진다.
- 일반 학습 모드와 게임 모드에서 재사용 가능하다.
- UI 코드가 단순해진다.

## 10. 게임 확장 대비 구조

장기적으로 `game-mode`는 별도 feature로 추가한다.

```text
src/features/game-mode/
├─ falling-kanji/
├─ speed-challenge/
└─ school-test/
```

중요한 점:

- 게임 모드는 `PracticeEvaluation`을 재사용한다.
- 점수 계산 로직은 game-mode 계층에 둔다.
- 쓰기 판정 핵심은 domain/practice에서 유지한다.

## 11. 저장 전략

초기 MVP는 로컬 저장으로 충분하다.

### 추천 순서

1. 아주 빠르게 시작하려면 `AsyncStorage`
2. 기록과 콘텐츠가 커질 예정이면 `SQLite`

이 앱은 장기적으로 학습 기록과 콘텐츠가 늘 가능성이 높아서, 초기에 여유가 있으면 SQLite로 바로 가는 것도 괜찮다.
하지만 주니어 개발자라면 우선 AsyncStorage로 동작을 만들고, 나중에 SQLite로 이동하는 전략도 현실적이다.

## 12. 컴포넌트 설계 원칙

### 공통 컴포넌트 예시

- `Screen`
- `Button`
- `Card`
- `SectionHeader`
- `ProgressBadge`

### 기능 컴포넌트 예시

- `CharacterCard`
- `CharacterInfoPanel`
- `StrokeHintPlayer`
- `PracticeCanvas`
- `PracticeFeedbackPanel`

원칙:

- 공통 컴포넌트는 스타일과 레이아웃 중심
- 기능 컴포넌트는 특정 유즈케이스 중심

## 13. 테스트 전략

초기부터 모든 UI를 테스트할 필요는 없다.
대신 아래 우선순위를 추천한다.

### 1순위

- 쓰기 판정 함수
- 복습 우선순위 계산 함수
- 피드백 메시지 생성 함수

### 2순위

- 주요 화면 렌더링
- 핵심 버튼 동작

즉, 도메인 로직부터 테스트한다.

## 14. 구현 순서 제안

### 단계 1

- Expo 프로젝트 생성
- Expo Router 구성
- 기본 테마 및 공통 컴포넌트 생성

### 단계 2

- 로컬 샘플 데이터 구조 추가
- 한자 목록 / 상세 화면 구성

### 단계 3

- 쓰기 입력 캔버스 추가
- practice-store 구현

### 단계 4

- 판정 함수 구현
- 결과 화면 연결

### 단계 5

- progress-store 및 복습 로직 구현
- 홈 요약 연결

## 15. 초기 폴더 생성 우선순위

처음부터 모든 폴더를 만들 필요는 없다.
아래 정도만 먼저 시작하면 충분하다.

```text
app/
src/components/common/
src/features/character-list/
src/features/character-detail/
src/features/practice-session/
src/stores/
src/domain/practice/
src/services/
src/data/
```

## 16. 다음 작업 제안

이 문서 다음에는 아래 셋 중 하나로 바로 이어지는 것이 좋다.

1. Expo 프로젝트 생성
2. 폴더 구조 실제 생성
3. TypeScript 타입 파일과 샘플 데이터 파일 초안 작성
