# Kanji Data Sources

## 1. 목적

`seodang` 앱의 실제 한자 데이터 소스를 무엇으로 가져갈지 정리한다.

이 문서는 샘플 데이터를 지우고 실데이터 파이프라인으로 넘어갈 때의 기준 문서다.

## 2. 결론

현재 가장 현실적인 조합은 아래 세 가지다.

- `KANJIDIC2`: 한자 메타데이터
- `KanjiVG`: 획순 / stroke path
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

## 5. `kanjiapi.dev` 계열 오픈소스 JLPT JSON

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
- `인명용 한자`와 `인명용 이체자`는 별도 카테고리 그룹으로 분리한다.

## 6. 앱 규칙

- 한국어 UI에서는 `JLPT` 카테고리를 노출한다.
- 일본어 UI에서는 `JLPT` 카테고리를 숨긴다.
- 일본 학년 카테고리는 한국어/일본어 UI 모두에서 노출한다.

이 규칙은 현재 `kanji_categories.metadata.visibleLocales`로 제어한다.

## 7. 다음 단계

1. `KANJIDIC2` 기반 메타데이터 포맷 정의
2. `KanjiVG`의 character id와 메타데이터 id 맞추기
3. 오픈소스 JLPT JSON 기준 `N1~N5` 매핑 변환
4. 업서트 스크립트 작성
5. `sampleCharacters` 제거

## 8. 참고 링크

- JLPT 공식 레벨 설명
- KANJIDIC2 DTD
- KanjiVG
- kanjiapi.dev / JLPT 오픈소스 데이터
