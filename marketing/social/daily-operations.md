# 서당 일일 SNS 유입 운영

2026-10-19 시작. 담당 대화 01a1527c-f4a0-7d21-bd23-1d7261c0a85a, heartbeat `sns`, 매일 10:00 Asia/Seoul, ACTIVE. 자동화 설정 파일과 앱 조회로 확인했다. 월요일 주간 제품 분석 `automation`은 별도로 유지한다.

## 운영 범위

Instagram, X, Threads 모두 기존 기록의 계정은 `seodang_app`. 매번 실제 로그인 계정을 확인한 뒤 검증된 링크만 프로필에 적용한다. 공개 발행, 댓글, DM, 팔로우, 광고, 결제는 별도 승인 없이는 하지 않는다. 콘텐츠 초안과 일일 기록은 이 폴더에서 관리한다. 앱 코드·배포·커밋·푸시는 일일 운영 범위 밖이다. 다른 대화에 메시지를 보내지 않는다.

2026-10-19 Chrome에서 세 채널 모두 실제 @seodang_app 로그인 확인. Instagram 기존 양쪽 스토어 추적 링크는 유지했고, X는 전용 iOS 캠페인 링크를 저장한 뒤 공개 프로필에서 목적지 이동까지 검증했다. X Website는 100자 제한으로 Android 링크는 준비만 되어 있다. Threads는 iPhone·Android 링크를 각각 저장 후 프로필 주소로 직접 이동하고 공개 링크 목록에서 양쪽 파라미터를 확인했다. 상위 프로필 폼을 다시 저장하면 이전 링크가 덮이는 것으로 보이며, 이후 작업 시 공개 프로필 재조회를 반드시 거친다.

## 콘텐츠 기본 구성 · 2026-10-19 사용자 지정

앞으로 Instagram·Threads·X 콘텐츠는 소재마다 다음 두 버전을 반드시 함께 준비한다.

1. 한국어 본문 + 한국어 이미지: 한국어 사용자를 대상으로 일본어 학습을 소개한다.
2. 일본어 본문 + 일본어 이미지: 일본어 사용자를 대상으로 한국어 학습을 소개한다. 한글·발음·한국어 표현과 상황을 중심으로 설명하며, 일본어 학습 앱 소개를 그대로 번역하지 않는다.

2026-10-19 후속 사용자 지시로 게시 형식을 변경했다. 앞으로 영상은 한국어판·일본어판 두 파일을 한 게시물에 함께 첨부한다. 본문도 한국어·일본어 안내를 함께 넣는다. Instagram·Threads·X 각각 게시물 한 건이 기본이며, 언어별 독립 게시물로 나누지 않는다. 플랫폼이 복수 영상 첨부를 제한하면 임의로 두 게시물로 나누지 말고 가능한 대안을 확인한다. 친근한 말투와 실제 학습 기능에 맞는 설명을 유지한다. 이번 편의점 수정 영상은 세 채널 즉시 발행 승인을 받았다.

이 요청은 향후 콘텐츠 준비 방식에 대한 지속 지침이다. 10/19의 6건 발행 승인은 완료된 해당 게시물에 적용되며, 향후 공개 발행은 기존의 별도 승인 원칙을 유지한다.

## 설치를 목표로 한 콘텐츠 방향 · 2026-10-19 후속 지침

학습 표현 설명만 반복하지 않는다. 대상 사용자가 겪는 상황 → 실제 앱에서 연습하는 모습 → 다운로드 후 시작할 학습을 보여준다. 기능·효과는 앱에서 확인한 범위만 설명하고, 조회수보다 프로필 방문·스토어 방문·다운로드 흐름을 구분해 관찰한다. 소재는 여행 상황, 글자 입문, 학습 습관, 개발자의 실제 사용 경험 등으로 바꾼다. 한국어·일본어 영상 두 개와 이중 언어 본문은 계속 한 게시물에 묶는다.

다음 준비물은 `assets/2026-10-20/letters-start/`의 글자 입문 이미지 콘텐츠(한국어·일본어 각 1장, 한 게시물). 내일 발행용 준비 요청이며 발행·예약 요청은 아직 없다.

## 추적 링크와 측정 경로

`channel-links.json`이 원장이다. 새 준비 링크의 source는 instagram/x/threads, medium은 organic_social, campaign은 seodang_202610_launch, content는 profile. 단, Instagram 실제 프로필에 기존 Android UTM(social / seodang_ig_202610 / link_in_bio)과 iOS pt/ct가 확인되어 그대로 보존했다. 보고 시 준비 링크가 아니라 실제 배포된 파라미터를 사용한다. 게시물은 발행 승인 시 YYYYMMDD_소재_형식으로 content를 고정한다. 프로필을 통해 온 클릭은 특정 게시물에 귀속하지 않는다.

- Android: Google Play 직접 URL의 utm_source/utm_campaign으로 Play Console → 사용자 늘리기 → 스토어 실적 → 전환 분석에서 구분한다. 광고 및 추천 소스 필터가 필요할 수 있다. 방문자·설치 버튼 클릭·성공한 획득을 별도 기록한다. 클릭은 설치가 아니다.
- iOS: App Store Connect → Analytics → Acquisition → Campaigns 또는 Metrics의 Campaign 필터. 기존 Instagram/Threads의 검증된 pt/ct를 유지한다. X는 기존의 검증된 provider token을 재사용한 구성 링크로, Chrome 공개 프로필에서 캠페인 주소로 이동은 검증했으며, 실기기 및 보고 수신은 미검증이다. UTM만으로 Apple 캠페인이 생긴다고 설명하지 않는다. 소규모/개인정보 제한 빈칸은 0이 아니다.
- SNS: 계정 소유자 인사이트의 노출·프로필 방문·외부 링크 클릭을 기간별로 읽는다. 공개 게시물 누적 조회수는 일일 노출과 구분한다. 클릭 로그 서버나 통합 랜딩 페이지는 현재 없다. UTM 문자열을 붙이는 것만으로 자체 클릭 로그가 수집되지는 않는다.
- 앱: PostHog project650471, client=seodang-capacitor AND environment=production. 선택 동의 설치ID만 관측. 앱의 허용 속성에 UTM이 없으므로 채널→설치→학습을 개인 단위로 연결할 수 없다. 채널별 학습 전환·D1/D7은 측정 불가로 두고 전체 관측 지표만 별도 표시한다.

한 개 URL만 가능한 프로필에서는 우선 기존 iOS 링크를 보존하고 Android 링크를 어떻게 노출할지 사용자와 결정한다. 통합 페이지를 배포하기 전 존재하지 않는 주소를 프로필에 넣지 않는다. 여러 링크를 허용하는 경우 iOS/Android 제목을 명확히 구분한다.

## 매일 기록 순서

1. 전날 KST 00:00~24:00 및 이전 보고를 읽는다. 조회 시각·플랫폼 보고 시간대·집계 지연을 기록한다. 최근 7일 데이터가 늦게 들어오면 수정 이력을 남긴다.
2. 계정 연결과 링크 작동, 스토어 출시·수집 상태를 먼저 확인한다. 출시 1.1.2는 10/19 인계로 양쪽 공개 확인, Android는 이 대화 Chrome에서 100% 출시도 확인. 10/16의 제출 대기 문서보다 최신 근거가 우선이다.
3. 플랫폼 노출→프로필 방문→링크 클릭→스토어 방문→설치 버튼 클릭→실제 다운로드를 각각 기록한다. 단위가 다르거나 동일 코호트가 아니면 수치를 나누어 전환율을 만들지 않는다.
4. PostHog는 서버 skills-first, 문서·스키마·카탈로그를 확인한다. 카탈로그 접근은 10/19 data_catalog:read 부족으로 실패했으므로 공인 정의라고 하지 않는다. 읽기 쿼리는 가능했다. 기존 prototype/scripts/weekly-analytics-queries.py 및 docs/weekly-analytics.md 정의를 참고하되 주간 보고·대시보드는 변경하지 않는다.
5. 신규 관측 학습은 수집 시작(2026-10-16) 이후 설치ID별 최초 lesson_started가 해당 날인 수. 신규 설치나 신규 사람으로 부르지 않는다. 첫 수업 완료는 최초 시작 시도의 (distinct_id,lesson_id,attempt_id)를 연결하여 24시간 내 완료를 집계한다. 관측 창이 안 찼으면 pending으로 표시하며 완료율 결론을 보류한다.
6. D1/D7은 첫 analytics_enabled 한국 날짜 +1/+7일에 learning_progress가 있는 동의 설치/성숙 참여 설치. 주간 정의와 동일하게 전체 관측 참여 재방문이며 설치 유지율이 아니다. 수집 시작 전 이력·재동의로 신규가 과대 표시될 수 있다. 분모 0이면 비율 없음. 오프라인 최대 7일 지연으로 최근 값은 잠정치다.
7. 표본이 적으면 채널 순위나 개선 효과를 결론내리지 않는다. 변화·완료·실패·사용자 조치 필요가 있을 때만 알리고 같은 로그인 요청을 매일 반복하지 않는다. 무변화는 파일 기록만 갱신한다.

## 지표 기록 형식

보고 JSON의 metrics 각 행: channel, metric, period_start, period_end_exclusive, timezone, value, numerator, denominator, unit, status, source, checked_at, note. 미조회/미연결/제한/미성숙은 null 및 사유. 수집 범위에서 확인한 0만 숫자 0. cumulative_snapshot과 daily는 비교하지 않는다.

## 근거

- Google Play 보고: https://support.google.com/googleplay/android-developer/answer/9859173?hl=en (2026-10-19 확인, 설치 버튼 클릭과 실제 획득 구분)
- Apple 캠페인: https://developer.apple.com/help/app-store-connect-analytics/acquisition/campaign-links (기존 provider token 재사용, 캠페인별 표시 한계)
- PostHog 이벤트: https://posthog.com/docs/data-warehouse/sources/posthog#posthog-data-warehouse-tables
- 대시보드: https://us.posthog.com/project/650471/dashboard/2180325

### 운영자 점검 영향

9/30 X 공개 조회13→14처럼 운영자 점검 자체가 조회수에 영향을 줄 수 있다. X 프로필 QA 클릭1회가 포함되므로 작은 조회·클릭 변화는 성과로 알리지 않는다.

콘텐츠 준비 전에 최근 발행 기록의 상황·대표 문장·영상 장면을 대조한다. 도입이나 설치 안내만 바꾸고 이미 발행한 학습 장면을 다음 날 새 콘텐츠로 반복하지 않는다. 10/20 편의점 물 주문 재편집안은 사용자 피드백으로 제외했다.

## 2026-10-20 일회성 발행 승인

사용자가 글자 입문 사진 두 장과 준비한 본문으로 Instagram·Threads·X에 한 게시물씩 내일 올리라고 명시적으로 승인했다. 기존 sns heartbeat의 10/20 10:00 Asia/Seoul 실행에 이 작업을 등록했다. letters-start/01-ko.png → 02-ja.png 순서, Instagram·Threads는 instagram-threads-caption.txt, X는 x-caption.txt 사용. 추가 승인 없이 실행하며 채널별 기존 게시 여부와 실제 게시 URL을 확인해 중복을 방지한다. 그 외 미래 게시물 자동 발행 권한은 부여하지 않았다.
