# 앱 설치 유입 경로 — 구현 완료, 배포·실기기 검증 대기

2026-10-19. 목표는 웹 링크 클릭이 아니라 설치 후 서당을 실행한 통계 참여 기기의 유입 채널 확인이다. 체험 Site는 수정·배포하지 않는다.

## 수집

- Android: Google Play Install Referrer 2.2. 앱 실행 후 버전 3 동의가 있을 때만 조회한다. utm_source/medium/campaign/content 중 100자 이하 영문·숫자·하이픈·밑줄만 허용한다. 원본 referrer, 이메일, URL, 광고 클릭 ID는 내보내지 않는다.
- 설치일은 Android 패키지 firstInstallTime의 UTC 날짜다. within_24h는 관측할 때 설치 후 24시간 이내라는 뜻이며 생애 첫 설치/첫 실행을 보장하지 않는다. 기존 설치·업데이트 후 관측은 older_install로 구분한다.
- install_attribution은 통계 설치ID당 한 번 기록하며 이후 이벤트에도 같은 캠페인을 붙인다. 이전 동의 버전은 다시 동의해야 한다. 철회는 출처·ID·대기 이벤트를 함께 지운다. 진행 중 응답도 이전 ID면 버린다.
- Play 오류는 organic/direct로 바꾸지 않고 다음 앱 열기 때 재시도한다. 90일이 지난 설치는 Play 출처 조회에 한계가 있다. 실제 캠페인 링크도 누가 붙인 라벨인지에 의존하며 서명된 광고 성과 증명은 아니다.
- iOS: 현재 App Store pt/ct 캠페인의 출처를 개별 PostHog 설치ID에 연결할 수 없다. unsupported로 기록한다. Apple 집계 캠페인 통계는 App Store Connect에서 확인하며 개별 사용자와 결합하지 않는다.
- 신규 install_attribution 이벤트 및 schema_version/consent_version 3. 기존 client=seodang-capacitor, environment=production 필터 유지.

## 보고서

기존 대시보드 2180325에 '09 · 앱 실행 기기는 어디서 유입됐나요?'를 추가했다. 최근 30일 app_opened 설치ID와 최근 365일 출처 이벤트를 연결한다. 승인 카탈로그가 없는 서당 전용 정의다. 기기 수는 사람이 아닌 임의의 설치ID이며 재설치·재동의가 중복을 만들 수 있다. 오래된 출처가 365일 조회창에서 빠지면 확인 불가로 표시한다. 출처 없는 실행도 분모에서 제외하지 않는다. 과거 실행에 미래 관측한 출처가 연결될 수 있어 최초 설치일 코호트나 다운로드 성과 지표로 해석하지 않는다.

https://us.posthog.com/project/650471/dashboard/2180325

## 마케팅 링크

`marketing/social/app-acquisition-links.json`에 Android의 referrer= 안에 UTM을 넣은 링크를 준비했다. 기존 게시 링크는 수정하지 않았다. 바깥 URL에 UTM만 붙인 이전 Android 링크와 다르다. iOS 기존 pt/ct 링크는 유지한다.

## 출시 전 필요한 검증

이 변경은 아직 스토어에 배포하지 않았다. 새 Android 빌드를 Play 내부 테스트 트랙에 올린 뒤 준비 링크로 실제 설치 → 실행 → 동의 → PostHog install_attribution 수신을 검증해야 한다. 테스트에는 environment=development를 적용하고 운영 지표에서 제외한다. 출처, 캠페인, 설치일, 재실행 중복 방지, 철회 후 중단을 확인한다. 실제 Play 설치 경로 수신은 로컬 Java 컴파일이나 JS 모의 테스트로 증명되지 않는다.

스토어 개인정보 고지의 수집 항목/목적과 공개 개인정보처리방침도 이 빌드에 맞춰 갱신해야 한다. 버전 3 재동의로 ID가 바뀌므로 기존 사용자 수·유지율과 단순 비교하지 않는다.

## 근거

- https://developer.android.com/google/play/installreferrer/library
- https://developer.apple.com/help/app-store-connect-analytics/acquisition/campaign-links

## 이번 작업 검증

- Node 테스트 214/214 통과(출처/동의 경계 신규 테스트 5개 포함).
- JDK 21로 Android `:app:compileDebugJavaWithJavac` 성공. Play 실제 설치 수신은 미검증.
- 한국어·일본어 동의 안내를 글자 크기 1.2, 320/390px에서 확인: 가로 넘침 없음, 두 버튼 같은 행. 긴 안내는 대화상자 안에서 스크롤한다.
- 웹 빌드 성공. 모바일·데스크톱은 같은 진입점. 새 수집 모듈 gzip 927바이트, CSS 추가 없음. 대형 브라우저 SDK는 추가하지 않았다.
- PostHog insight qsDXYTjd / 13025239, tile 13841738을 저장하고 재조회했다. 기존 주간 텍스트 타일 13709758은 유지했다. 확인 시 최근30일 3개 설치ID 모두 iOS로 출처 확인 불가.
- 실사용 수신 확인 전이므로 배포 완료나 출처 측정 완료로 해석하지 않는다.
