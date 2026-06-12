# Kanji Data Sources

## 1. 목적

`seodang` 앱의 실제 한자 데이터 소스를 무엇으로 가져갈지 정리한다.

이 문서는 샘플 데이터를 지우고 실데이터 파이프라인으로 넘어갈 때의 기준 문서다.

## 2. 결론

현재 가장 현실적인 조합은 아래 네 가지다.

- `KANJIDIC2`: 한자 메타데이터
- `KanjiVG`: 획순 / stroke path
- `AnimCJK`: `KanjiVG`에 없는 일부 일본 한자 stroke 보완
- `kanjiapi.dev` 계열 오픈소스 JLPT JSON: JLPT N1~N5 카테고리 분류

## 3. 소스별 역할

### `KANJIDIC2`

역할:

- 한자 기본 메타데이터
- 의미
- 음독 / 훈독
- 일본 학년
- 기타 사전성 정보

왜 쓰는가:

- 메타데이터 구조가 안정적이다.
- 한자 단위 DB를 만들기에 적합하다.

주의:

- JLPT 필드는 구버전 시험 기준 정보라 그대로 신뢰하면 안 된다.
- 새 `N1~N5`용 공식 리스트는 아니다.
- `grade`는 `초1~초6`, `중학교`, `인명용 한자`, `인명용 이체자` 정도까지만 직접 구분 가능하다.
- `고1~고3` 같은 분류는 `KANJIDIC2` 원본만으로는 만들 수 없다.

## 4. `KanjiVG`

역할:

- stroke order
- SVG path
- 쓰기 힌트 애니메이션
- 기준 stroke 판정 데이터

왜 쓰는가:

- 현재 앱의 쓰기 연습 코어와 가장 잘 맞는다.

제한:

- 현재 앱 DB 기준 `KanjiVG`와 1:1 매칭되는 한자는 `6431`개였다.
- `KANJIDIC2` 기반 확장 후보 전체를 커버하지는 못한다.

## 5. `AnimCJK`

역할:

- `KanjiVG`에 없는 일부 일본 한자의 추가 stroke source
- SVG 기반 stroke path / median path 제공

왜 쓰는가:

- 일본용 `svgsJa` 세트가 있고 구조가 단순해서 변환 스크립트로 적재하기 쉽다.
- `reviewOnly` 기준 누락 한자 중 일부를 오픈소스로 바로 메울 수 있다.

현재 확인 결과:

- `AnimCJK svgsJa` 전체 파일 수: `7007`
- 우리 `reviewOnly` 누락 한자 `6148`개 중 `388`개를 커버
- 비교 결과 파일: [animcjk-covered-reviewonly.generated.json](/Users/kangmihye/Desktop/study/seodang/data/generated/animcjk-covered-reviewonly.generated.json:1)

현재 방향:

- `KanjiVG`를 1차 source로 유지
- 부족한 한자 중 `AnimCJK`에 있는 `388`자는 우선 보강 후보로 사용
- 나머지 누락 한자는 다른 source를 별도 검토

## 6. `kanjiapi.dev` 계열 오픈소스 JLPT JSON

역할:

- `JLPT N1~N5` 카테고리용 분류 소스

왜 쓰는가:

- JLPT 공식 사이트는 시험 레벨 설명은 제공하지만, 새 `N1~N5` 한자 공식 리스트는 제공하지 않는다.
- `kanjiapi.dev` 계열 공개 데이터는 이미 JLPT 레벨이 정리된 JSON을 제공한다.
- 직접 Tanos 페이지를 손으로 옮기는 것보다 파이프라인이 안정적이다.

현재 방향:

- `kanji_categories`에는 `jlpt_n5 ~ jlpt_n1`를 만든다.
- 실제 한자 매핑은 오픈소스 JLPT JSON의 `jlpt` 값을 기준으로 `kanji_character_categories`에 넣는다.
- 일본 학년 카테고리는 `초1~초6`과 `중학교`만 만든다.
- `인명용 한자`와 `인명용 이체자`는 메타데이터 참고용으로만 두고, 현재 앱 카테고리에는 노출하지 않는다.

## 7. 앱 규칙

- 한국어 UI에서는 `JLPT` 카테고리를 노출한다.
- 일본어 UI에서는 `JLPT` 카테고리를 숨긴다.
- 일본 학년 카테고리는 한국어/일본어 UI 모두에서 노출한다.

이 규칙은 현재 `kanji_categories.metadata.visibleLocales`로 제어한다.

## 8. 다음 단계

1. `KANJIDIC2` 기반 메타데이터 포맷 정의
2. `KanjiVG`의 character id와 메타데이터 id 맞추기
3. `AnimCJK`의 SVG를 `kanji_characters` / `kanji_strokes` 형식으로 변환
4. 오픈소스 JLPT JSON 기준 `N1~N5` 매핑 변환
5. 업서트 스크립트 작성
6. `sampleCharacters` 제거

## 9. 스크립트 매핑

현재 데이터별로 어떤 스크립트를 쓰는지 정리하면 아래와 같다.

### 메타데이터 / 카테고리

- `KANJIDIC2 + JLPT source` 기반 메타데이터 생성
  - [scripts/build-kanji-metadata-from-sources.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/build-kanji-metadata-from-sources.mjs:1)
- Supabase `kanji_characters`, `kanji_categories`, `kanji_character_categories` 업서트
  - [scripts/supabase-upsert-kanji-metadata.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/supabase-upsert-kanji-metadata.mjs:1)

### 뜻 보강 리뷰 파일

- 뜻/예문 보강용 리뷰 파일 생성
  - [scripts/build-kanji-enrichment-review.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/build-kanji-enrichment-review.mjs:1)
  - 기준 소스는 `KANJIDIC2` 기반 [kanji-metadata.generated.json](/Users/kangmihye/Desktop/study/seodang/data/generated/kanji-metadata.generated.json:1)
  - 현재 review row 수: `12559`
- 뜻/예문/메타데이터 보강 대상 audit 생성
  - [scripts/audit-kanji-enrichment.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/audit-kanji-enrichment.mjs:1)
  - 결과 파일: [kanji-enrichment-audit.generated.json](/Users/kangmihye/Desktop/study/seodang/data/generated/kanji-enrichment-audit.generated.json:1)
- 검수/제안 JSON을 리뷰 파일에 반영
  - [scripts/apply-kanji-enrichment-suggestions.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/apply-kanji-enrichment-suggestions.mjs:1)
  - 예: `npm run kanji:apply:enrichment-suggestions -- --input data/generated/kanji-enrichment-suggestions.batch-0001.generated.json --status=approved`
- audit 기준 다음 보강 대상 출력
  - [scripts/print-kanji-enrichment-audit-batch.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/print-kanji-enrichment-audit-batch.mjs:1)
  - 기본값은 실사용 대상 한자 50개이며, 전체 대상은 `-- --all`로 출력
- audit 기준 희귀/비실용 잔여분 자동 제안 생성
  - [scripts/build-kanji-enrichment-auto-suggestions.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/build-kanji-enrichment-auto-suggestions.mjs:1)
  - 예: `npm run kanji:build:auto-enrichment-suggestions -- --all --output data/generated/kanji-enrichment-suggestions.remaining.generated.json`
- 20개 검수 출력
  - [scripts/print-kanji-enrichment-batch.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/print-kanji-enrichment-batch.mjs:1)
- 리뷰 상태 변경
  - [scripts/update-kanji-enrichment-review.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/update-kanji-enrichment-review.mjs:1)
- 승인된 뜻 데이터만 Supabase 업로드
  - [scripts/supabase-upsert-kanji-enrichment.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/supabase-upsert-kanji-enrichment.mjs:1)
  - 예: `npm run supabase:upsert:kanji-enrichment -- --input data/generated/kanji-enrichment-review.generated.json`
  - 업서트는 DB에 이미 존재하는 `kanji_characters.id`와 매칭되는 row만 반영한다.
  - 현재 DB row 수는 `6819`, 현재 review와 매칭되어 업서트되는 row 수는 `6799`다.
- Supabase DB 기준 품질 리포트 생성
  - [scripts/report-kanji-db-quality.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/report-kanji-db-quality.mjs:1)
  - 실행: `npm run kanji:report:db-quality`
  - 기본 scope는 앱에서 실사용하는 practical 한자다.
  - 전체 DB를 보려면 `npm run kanji:report:db-quality -- --all`
  - 회귀 검사용으로 실패 코드를 원하면 `npm run kanji:report:db-quality -- --fail-on-issues`
  - `--all`은 비실사용 희귀 한자의 설명형 fallback까지 포함하므로 참고 리포트용으로만 사용한다.

### 뜻/예문 품질 정책

- 실사용 한자에서는 `meaning_ko`, `meaning_ja`, `example_ja`, `example_ko`가 모두 있어야 한다.
- `뜻 미상`, `意味未詳`는 DB에 남기지 않는다. 의미가 없거나 불명확한 비실사용 한자는 `null` 또는 설명형 fallback을 사용한다.
- `example_ja`는 가능하면 대상 한자를 직접 포함해야 한다.
- `JLPT`, `일본 학교 한자`, `상용한자` 범위에서는 일반 예문을 우선한다.
- 희귀 한자, 이름용 한자, 십간/고문 표현처럼 자연스러운 단문 예문을 만들기 어려운 경우 설명형 예문을 허용한다.
  - 예: `「晟」は日常ではあまり使われず、主に名前などで使われます。`
  - 이 허용 목록은 [scripts/report-kanji-db-quality.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/report-kanji-db-quality.mjs:1)의 `allowedFallbackIds`로 관리한다.

### 소스 차집합 분석

- `KANJIDIC2 reviewOnly` / `DB only` 차집합 리포트 생성
  - [scripts/report-kanji-source-set-diff.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/report-kanji-source-set-diff.mjs:1)
  - 실행: `npm run kanji:report:source-set-diff`
  - 현재 결과: `reviewOnly=5760`, `dbOnly=20`
  - `reviewOnly`는 `KANJIDIC2`에는 있지만 현재 DB에 stroke row가 없어 앱에 표시되지 않는 한자다.
  - `dbOnly` 20개는 `KanjiVG`에는 있지만 `KANJIDIC2` 메타데이터에는 없는 CJK 확장/호환 문자다. 예: `㐬`, `㓁`, `㔾`, `仝`, `喻`, `冷`, `令`, `𠮟`.

### Mazii 조사 / 추출

- 한 글자에 대해 `stroke + meaning + readings + examples` 프로브
  - [scripts/probe-mazii-strokes.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/probe-mazii-strokes.mjs:1)
- 여러 글자 배치 추출
  - [scripts/extract-mazii-strokes-batch.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/extract-mazii-strokes-batch.mjs:1)
- 전체 배치 청크 러너
  - [scripts/extract-mazii-strokes-all.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/extract-mazii-strokes-all.mjs:1)
- `draw 버튼 + SVG path` 기준 지원 문자 필터
  - [scripts/filter-mazii-supported-kanji.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/filter-mazii-supported-kanji.mjs:1)

### AnimCJK 보완

- `reviewOnly` 중 `AnimCJK svgsJa`로 커버되는 문자 목록 생성
  - 결과 파일: [animcjk-covered-reviewonly.generated.json](/Users/kangmihye/Desktop/study/seodang/data/generated/animcjk-covered-reviewonly.generated.json:1)
- 위 목록을 `kanji_characters` / `kanji_strokes` 적재용 generated JSON으로 변환
  - [scripts/build-animcjk-import-from-covered.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/build-animcjk-import-from-covered.mjs:1)
  - 결과 파일: [animcjk-import.generated.json](/Users/kangmihye/Desktop/study/seodang/data/generated/animcjk-import.generated.json:1)
- 변환된 `AnimCJK` generated JSON을 Supabase에 업서트
  - [scripts/supabase-upsert-animcjk-import.mjs](/Users/kangmihye/Desktop/study/seodang/scripts/supabase-upsert-animcjk-import.mjs:1)

## 10. 참고 링크

- JLPT 공식 레벨 설명
- KANJIDIC2 DTD
- KanjiVG
- AnimCJK
- kanjiapi.dev / JLPT 오픈소스 데이터
