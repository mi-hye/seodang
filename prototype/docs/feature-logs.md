# 기능 사용과 오류 로그

[PostHog 대시보드](https://us.posthog.com/project/650471/dashboard/2312018) · [최근 기능 로그](https://us.posthog.com/project/650471/insights/j8J5Youm)

최근 7일을 기본으로 수업 이용 추이, 기능 사용 횟수, 오류 코드, 성공 시 소요시간, 음성 재생 결과, 최근 100건의 기능 로그를 표시한다. 날짜 범위는 PostHog에서 바꿀 수 있다. `platform`으로 iOS/Android, `app_version`으로 버전을 좁혀 확인한다.

## 수집

기존 학습 이벤트에 `feature_operation`을 추가한다. 통계 공유 동의 버전 4가 있어야 저장·전송한다. 이전에 동의한 사용자는 새 안내를 한 번 받고, 선택하기 전에는 수집하지 않는다. 거절한 사용자는 다시 요청하지 않는다. 메시지 본문, 닉네임, 발화 내용, 녹음, 오류 원문·스택, URL, 계정·상대·방 ID 및 푸시 토큰은 수집하지 않는다.

| operation | 의미 |
| --- | --- |
| speech_recognition | 공통 말하기 화면의 음성 인식 시도 |
| conversation_load | 대화 화면 최초 세션·프로필·목록 불러오기 |
| conversation_open | 대화방 정보·메시지 불러오기와 읽음 처리 |
| conversation_match | 첫 메시지를 제출해 상대 연결을 요청한 결과 |
| message_send | 답장 저장 결과. 상대가 읽었다는 뜻은 아님 |
| profile_save | 닉네임 저장 요청 |
| conversation_refresh | 사용자가 당겨서 새로고침한 결과 |
| app_runtime | JavaScript 오류 또는 처리되지 않은 Promise 거부. 페이지당 최대 5건 |

시도마다 임의의 `operation_id`를 생성한다. `started` 후 음성 인식은 `ready`를 기록할 수 있다. 종료 결과는 `succeeded`, `failed`, `cancelled`, `waiting` 중 하나다. 재시도는 새 시도다. 상대를 기다리는 `waiting`과 사용자 취소는 오류가 아니다. `duration_ms`는 시작부터의 경과시간으로 말하기에서는 준비·발화 시간이 포함된다.

인식한 문장은 전송하지 않고 `recognition_result`에 `matched`, `different`, `free`만 남긴다. `different`는 학습 결과이며 앱 오류가 아니다. `no_speech`는 인식 결과가 빈 경우다. 오류는 미리 정한 코드로 바꾸고 모르는 오류는 `unknown`으로 기록한다.

목록의 자동 폴링과 읽음 처리 자체는 매번 이벤트를 만들지 않는다. 기존 재전송 큐(최대 200건·7일)를 재사용한다. 통계 저장·전송 실패가 메시지나 학습 동작을 막지 않도록 처리한다. 전송 실패 시 지수 백오프로 재시도하며 철회 시 대기 기록을 지운다.

## 해석과 한계

- 운영 대시보드는 `client=seodang-capacitor`, `environment=production`만 보여 준다. 새 기능 로그는 대응 앱 배포와 재동의 후부터 들어온다.
- 동의한 설치의 일부 활동만 보인다. 재설치·재동의는 새 설치 ID가 생기므로 사람 수와 같지 않다.
- 네이티브 충돌, OS 강제 종료, 화면 멈춤, 오프라인으로 마지막 로그가 누락될 수 있다. 시작만 남았다고 실패를 단정하거나 빈 표를 정상이라고 해석하지 않는다.
- 운영체제 종류는 기록하지만 기종·OS 버전은 추가 수집하지 않는다. iOS/Android 크래시 및 ANR은 스토어 진단과 함께 봐야 한다.
- 대시보드 처리시간은 전체 앱 응답시간이나 서버만의 지연시간이 아니다. 개인정보 보호를 위해 오류 상세 원문도 없으므로 코드와 재현 테스트를 함께 확인한다.
- 이벤트 기반 기능 기록이다. 콘솔 전체 수집·세션 재생·PostHog OTLP Logs SDK는 사용하지 않는다.

## 검증과 배포

`tests/analytics-operations.test.mjs`는 동의·철회·재동의·중복 종료·타이밍·오류 정규화·비수집 필드를 검사한다. 브라우저 테스트는 실제 메시지 실패/재시도와 말하기 불일치/빈 결과/권한 거부/취소 및 이전 동의의 1회 안내를 검사한다.

2026-11-06 개발용 수집 검증은 `environment=development`, `app_version=telemetry-verification`으로 분리했다. 의도적으로 발생시킨 로컬 Promise 오류의 시작/실패 2건을 PostHog 조회까지 확인했으며 운영 표에는 포함되지 않는다. 이번 작업은 앱/스토어 배포를 포함하지 않는다. 배포 시 공개 개인정보처리방침 및 스토어 진단 수집 항목을 최신 코드와 맞춘다.
