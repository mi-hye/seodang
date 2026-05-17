# Supabase Edge Functions

## 목적

`seodang` 앱에서 프론트가 직접 처리하던 로컬라이즈 분기와 카탈로그 조합 로직을 Supabase Edge Function으로 옮긴다.

현재 사용 중인 함수:

- `kanji-catalog`

이 함수는 아래 역할을 맡는다.

- `locale`에 맞는 카테고리 `label`, `description` 내려주기
- `categoryKey`에 해당하는 카테고리와 한자 목록 함께 내려주기

## 파일 위치

로컬 소스 파일:

- [supabase/functions/kanji-catalog/index.ts](/Users/kangmihye/Desktop/study/seodang/supabase/functions/kanji-catalog/index.ts)

## 배포 대상 프로젝트

현재 연결된 Supabase 프로젝트:

- project ref: `jrmtfhmhcbkdzqzhbgfv`
- dashboard: [kanzi project](https://supabase.com/dashboard/project/jrmtfhmhcbkdzqzhbgfv)

## 대시보드에서 확인하는 위치

Supabase Dashboard 경로:

1. 프로젝트 선택
2. 왼쪽 사이드바 `Edge Functions`
3. 함수 목록에서 `kanji-catalog` 확인

직접 링크:

- [Edge Functions Dashboard](https://supabase.com/dashboard/project/jrmtfhmhcbkdzqzhbgfv/functions)

## 호출 URL

배포 후 함수 호출 URL:

```text
https://jrmtfhmhcbkdzqzhbgfv.supabase.co/functions/v1/kanji-catalog
```

예시:

```text
GET /functions/v1/kanji-catalog?locale=ko
GET /functions/v1/kanji-catalog?locale=ko&categoryKey=jlpt_n5
```

## 로컬에서 배포하는 순서

이 환경에서는 Supabase CLI를 `/tmp/supabase`에 내려받아 사용했다.

1. 로그인

```bash
/tmp/supabase login
```

2. 프로젝트 연결

```bash
/tmp/supabase link --project-ref jrmtfhmhcbkdzqzhbgfv
```

3. 함수 배포

```bash
/tmp/supabase functions deploy kanji-catalog
```

## 배포 후 확인

anon key 기준으로 함수가 응답하는지 확인:

```bash
node /tmp/check_kanji_catalog_after_deploy.js
```

확인 포인트:

- 카테고리 목록 응답이 `200`인지
- `jlpt_n5` 조회 시 `characters`가 비어 있지 않은지

## 주의사항

- 로컬에 함수 파일이 있어도 자동 배포되지 않는다.
- 프론트가 `functions/v1/kanji-catalog`를 호출하도록 바뀐 상태면, 함수가 배포되지 않았을 때 `404`가 난다.
- 앱에서 카테고리를 못 불러오면 먼저 함수 배포 여부를 확인한다.

## 현재 상태

현재 `kanji-catalog` 함수는 배포 완료 상태다.

- 카테고리 목록 응답: 정상
- `jlpt_n5` 한자 목록 응답: 정상
