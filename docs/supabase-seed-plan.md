# Supabase Seed Plan

## 1. 목표

Supabase를 `stroke 저장소`에서 `앱 메타데이터 저장소`로 확장한다.

이번 단계에서 넣을 데이터는 세 종류다.

- 카테고리 그룹
- 카테고리
- 한자 메타데이터

그리고 한자와 카테고리의 연결은 별도 매핑 테이블로 관리한다.

## 2. 핵심 원칙

한 한자는 여러 카테고리에 동시에 속할 수 있어야 한다.

예:

- `学`이 `일본 중학교`에 속할 수 있다.
- 같은 `학`이 `JLPT N5`에도 속할 수 있다.

그래서 `kanji_characters`에 카테고리 하나만 넣는 구조가 아니라 아래처럼 간다.

- `kanji_category_groups`
- `kanji_categories`
- `kanji_character_categories`

## 3. 시드 파일

현재 추가된 시드 파일:

- [kanji-category-groups.json](/Users/kangmihye/Desktop/study/seodang/data/seeds/kanji-category-groups.json)
- [kanji-categories.json](/Users/kangmihye/Desktop/study/seodang/data/seeds/kanji-categories.json)
- [kanji-character-categories.sample.json](/Users/kangmihye/Desktop/study/seodang/data/seeds/kanji-character-categories.sample.json)
- [kanji-metadata.sample.json](/Users/kangmihye/Desktop/study/seodang/data/seeds/kanji-metadata.sample.json)

## 4. 업서트 순서

1. `kanji_category_groups`
2. `kanji_categories`
3. `kanji_characters` 메타데이터 업데이트
4. `kanji_character_categories`

이 순서로 넣어야 foreign key 충돌이 없다.

## 5. 필드 역할

### `kanji_characters`

- 한자 자체 정보
- 뜻
- 읽기
- 예문
- 대표 속성

대표 속성 예:

- `jlpt_level`
- `japanese_school_level`
- `japanese_grade`

이 값들은 요약용이다.

### `kanji_categories`

- 실제 화면 카테고리 노출용
- `일본 초1`
- `일본 중학교`
- `JLPT N5`
- `JLPT N2`

현재는 `metadata.visibleLocales`로 언어별 노출 여부도 함께 관리한다.

예:

- `["ko", "ja"]` : 한국어/일본어 UI 둘 다 노출
- `["ko"]` : 한국어 UI에서만 노출

### `kanji_character_categories`

- 실제 필터링 기준
- 한자가 여러 카테고리에 동시에 속하도록 만드는 테이블

## 6. 다음 구현

다음 단계에서 만들 것:

- seed JSON을 읽어 Supabase에 업서트하는 스크립트
- `useKanjiCategoryGroupsQuery`
- `useKanjiByCategoryQuery`
- `useKanjiDetailQuery`

그 다음 `sampleCharacters`를 점진적으로 제거한다.
