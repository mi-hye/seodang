# 메시지 알림

대화 탭 읽지 않음 표시와 앱 안 배너는 기존 인증/RLS API를 사용한다. 보이는 동안 20초 간격으로 확인하며 시작 시 과거 메시지는 배너로 재표시하지 않는다. 잠금화면 푸시는 별도 서버 발송이다.

## 서비스 구성

- Firebase: Seodang (`seodang-8641a`), Android `com.mihye.seodang`, Spark. Analytics/Gemini 추가 기능은 끔. `android/app/google-services.json`은 공개 클라이언트 구성이다.
- FCM: 발송 전용 `seodang-message-push` 서비스 계정, Firebase Cloud Messaging API 관리자 역할. `FCM_SERVICE_ACCOUNT`는 서버 비밀에만 저장. OAuth 및 발송 API dry-run 인증 확인 완료.
- iOS: Capacitor PushNotifications/APNs. AppDelegate 등록 콜백과 `aps-environment` Debug development / Release production. Apple Team `3T2UW5PZDA`, 기존 서당 Expo APNs 키 재사용 및 서버 등록 완료. 개인키는 저장소/앱에 넣지 않는다.
- Supabase: private push_devices / push_outbox, authenticated 자기 기기 등록 RPC, service_role 전용 claim/finish. 메시지 insert → outbox → pg_net Edge 호출. cron 1분 재시도. 24시간 만료, 최대5회, 2분 lease. 7일이 지난 내역은 다음 발송 결과 처리 때 삭제(고정 7일 상한 아님).
- 프로필이 있는 사용자가 대화 목록에 처음 들어오면 OS 알림 허용창을 요청한다. 이미 거절한 경우 설정 안내를 한 번 표시하며, 닫거나 거절하면 재진입/폴링에서 반복하지 않는다. 작성 중/딥링크 방에서는 요청하지 않고 목록 복귀까지 기다린다. 내 정보에서 켜기·끄기·설정 열기를 제공하고 직접 끈 알림은 자동으로 다시 켜지 않는다. 켜짐 표시는 OS권한+서버토큰 저장 성공 후에만 한다. 앱 시작/복귀는 권한과 등록 상태를 확인하며 새 허용창은 요청하지 않는다.
- 발송 전 읽음/차단/정지/계정삭제 확인. OS payload는 고정 새 메시지 문구+room/message UUID만 포함. 본문/닉네임을 전송하지 않는다. 재시도는 room별 notification tag/APNs collapse ID로 묶는다.

## 서버 구성 순서 (서버 연결 완료, 공개 고지 전 클라이언트 OFF)

1. `20261105115754_community_message_push.sql` 검증 후 적용.
2. Edge 비밀: `APNS_PRIVATE_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `FCM_SERVICE_ACCOUNT`, `MESSAGE_PUSH_WORKER_SECRET`. 기본 Supabase URL/service key는 서버 내장 환경 사용.
3. 동일 worker secret을 Vault `message_push_worker_secret`에 저장. 키/토큰을 로그에 출력하지 않기.
4. `message-push` Edge Function은 JWT gateway 대신 긴 worker secret을 검증하도록 배포. 외부 클라이언트에는 secret 제공 금지.
5. `20261105115900_schedule_message_push.sql` 적용. 공개 개인정보처리방침 배포와 양쪽 스토어 개인정보 항목 반영 후에만 `src/message-push-config.js`의 해당 플랫폼을 활성화. 2026-11-06 현재 소스는 양쪽 false이며, 이미 설치된 앱과 서버 워커에는 이 변경이 원격 반영되지 않는다.
6. `ios:sync:dev` / `cap sync android` 후 재빌드. 실제 기기 수신 테스트가 끝나기 전 스토어 배포하지 않기.

## 검증

- 네이티브 앱은 JS SDK 없이 `Capacitor.Plugins.PushNotifications` 주입 객체를 사용한다. 테스트도 `registerPlugin` 없는 환경을 포함한다.
- `node --test tests/message-push.test.mjs`: 권한 미자동요청, 등록 실패/거부, 권한철회, worker 인증, lease, APNs 서명/내용.
- `PUSH_SQL_CONTAINER=seodang-push-test node --test tests/message-push-sql.test.mjs`: 로컬 전용 DB에서 소유자/RLS, 읽음/차단/삭제, lease/잘못된token.
- `npx playwright test tests/browser/exchange.spec.js`: 한일/320px/큰글씨, 배너→해당방, 현재방알림생략, 잘못된UUID, 권한클릭.
- 실제 기기: 앱 종료/백그라운드·포그라운드, 알림 탭 cold/warm launch, 같은방 억제, 권한 거절/설정복귀/끄기, iOS development 및 TestFlight production, Android13+를 확인한다.
