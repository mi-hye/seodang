# 서당 커뮤니티

앱 하단 **함께 / 交流**에서 연다. 기존 학습 기록과 커뮤니티 계정은 분리된다.

## 사용 흐름

- 로그인 화면 없이 Supabase 익명 인증으로 계정을 만들고 기기에 세션을 저장한다. 앱 재실행 시 같은 세션을 갱신한다. 하드웨어 ID, 광고 ID, 이메일, 비밀번호를 수집하지 않는다.
- 첫 방문에 닉네임과 사용하는 언어를 정하고 교류 규칙에 동의한다. 자기소개는 선택이다.
- **이야기**: 한국어·일본어 글, 언어 필터, 댓글, 작성자가 허용한 글의 표현 교정. 글과 댓글은 작성자가 삭제할 수 있다.
- 이름을 누르면 프로필에서 **대화 요청**을 보낼 수 있다. 수신자가 수락해야 메시지를 보낼 수 있다. 거절된 요청은 다시 만들지 못한다.
- **대화**: 요청과 대화 목록. 열려 있는 대화는 15초 간격으로 새 메시지를 확인한다. 화면을 나가거나 앱이 숨겨지면 조회를 중단한다. 푸시 알림은 아직 없다.
- 신고는 글·댓글·메시지에서 가능하다. 차단은 상대 프로필에서 하고 내 소개에서 해제한다. 양쪽 모두 글·대화를 읽거나 새 메시지를 보낼 수 없게 서버에서 차단한다.
- 계정 삭제는 서버 인증 계정과 연결된 프로필·글·댓글·대화를 제거한다. 학습 기록은 유지한다.

## 기기 계정의 범위

세션은 `seodang.community.session.v1`에 저장한다. 앱 삭제·저장 공간 초기화·다른 기기로 이동 시 기존 계정 복구는 지원하지 않는다. 네트워크 장애만으로 새 계정을 만들지 않으며, 세션 갱신이 영구적으로 거부되면 새 기기 계정을 만든다. 원시 기기 ID를 비밀번호처럼 사용하지 않는다.

Supabase Auth `external_anonymous_users_enabled=true`, 익명 생성 기본 제한 30회/IP/시간을 유지한다. 기존 학습·한자·음성 테이블의 정책을 확인했고 익명 인증 활성화로 새 쓰기 권한이 열리지 않는다. 로그인·메일 인증 화면과 메일 발송 서비스는 필요 없다.

## 구현

- `src/community.js`, `community.css`, `community-copy.js`: 선택 시 지연 로딩. 한국어·일본어 UI. 320/390px, 큰 글씨 설정 확인.
- `src/community-api.js`: 세션 갱신, 제한된 REST 요청, 전송 결과가 불명확할 때 같은 ID 재사용. 서비스 키는 클라이언트에 포함하지 않는다.
- `src/community-config.js`: 공개 URL와 anon 클라이언트 키만 포함.
- `supabase/migrations/*community*`: 프로필·글·댓글·차단·대화방·메시지·신고. 모두 RLS 활성화. 회원 ID는 검증된 JWT의 `auth.uid()`를 사용한다.
- `community_private.suspensions`: 운영자만 접근하는 이용 제한 목록. 사용자 입력으로 제한 해제 불가.
- `supabase/functions/community-delete-account`: 호출자의 실제 인증 계정만 삭제. 클라이언트가 보낸 사용자 ID를 신뢰하지 않는다.

기존 프로토타입의 학습 단계 저장소와 학습 분석 이벤트에 게시글·메시지 본문을 넣지 않는다. 읽기는 회원에게 공개하며 로그인 절차 없이 기기 계정을 만들 수 있으므로 민감한 내용을 게시하면 안 된다. 1:1 메시지는 참여자만 읽을 수 있고 운영자는 신고 대응 시 확인할 수 있다. 종단간 암호화 메신저는 아니다.

## 신고 운영

Supabase SQL Editor에서 운영자 권한으로 확인한다. 사용자에게 서비스 키를 제공하지 않는다.

```sql
select id, created_at, reporter_id, reported_user_id, reason, post_id, reply_id, message_id
from public.community_reports where status='open' order by created_at;
```

해당 ID의 글·댓글 또는 신고된 메시지만 확인하고 다음 중 필요한 조치를 한다.

```sql
-- 대상 UUID를 확인한 뒤 실행한다.
-- delete from public.community_posts where id = '<post UUID>';
-- delete from public.community_replies where id = '<reply UUID>';
-- insert into community_private.suspensions(user_id,reason)
-- values ('<user UUID>','검토한 사유') on conflict(user_id) do update set reason=excluded.reason;
-- update public.community_reports set status='resolved', reviewed_at=now() where id='<report UUID>';
-- 오신고는 status='dismissed'로 처리한다.
```

신고는 자동 판정하지 않는다. 운영자가 접수 내역을 확인해야 한다. 처리 상태는 클라이언트가 수정할 수 없다. 탈퇴하면 연관 신고도 삭제되는 현재 보존 정책을 따른다.

## 검증

`npm run check`, `npx playwright test community.spec.js` (prototype 폴더).
`python3 prototype/scripts/check-community-security.py` (루트): 실제 익명 계정 3개로 권한 검사 후 계정·게시물을 모두 정리한다. 이메일은 보내지 않는다. 테스트 생성도 Auth의 IP 제한에 포함되므로 반복 실행을 제한한다.

스토어 배포는 별도 작업이다. 공개 배포 전에 개인정보 안내와 스토어의 사용자 생성 콘텐츠/데이터 항목을 실제 운영 정책에 맞춰 갱신한다. 신고 운영 화면·푸시 알림·기기 간 계정 복구는 이번 범위에 포함하지 않았다.

## 첫 화면 크기

커뮤니티 화면·API·번역·CSS는 탭을 눌렀을 때만 불러온다. 같은 체크아웃에서 커뮤니티 진입 코드만 제외한 app.js와 비교하면 초기 gzip 증가는 약 0.23KB이며 초기 CSS 증가는 없다. 공유 작업 폴더에서는 다른 수업 대화의 변경도 동시에 들어오므로 전체 빌드 크기 차이를 커뮤니티 증가분으로 해석하지 않는다. 최종 검증 빌드는 초기 JS 65,222B, 초기 CSS 15,642B, 전체 JS 226,878B(gzip)였다.

익명 인증은 이 기능의 의도된 접근 방식이다. Supabase 보안 진단의 anonymous-sign-in 안내는 소유자·참여자·차단 정책과 함께 검토했고 실제 익명 계정으로 검증했다. 운영자 전용 `community_private.suspensions`는 클라이언트 접근 정책 없이 차단하는 것이 의도다.

교류 재진입 시 `seodang.community.feed.v1`의 내 소개와 최근 글 20개를 즉시 표시하고 새 글을 뒤에서 조회한다. 캐시는 인증 계정 ID가 일치할 때만 사용하며 메시지 본문은 저장하지 않는다. 차단·탈퇴·인증 거절 때는 캐시를 제거한다. 일시적인 연결 실패에는 이전 글을 유지한다. 백그라운드 응답은 다른 메뉴나 작성 중인 입력을 덮어쓰지 않는다. 모국어 표기는 한국어 `모국어`, 일본어 `母語`다.

교류 첫 진입에서 저장된 프로필이 없으면 기본 정보 설정을 표시한다. 이후 진입은 글 목록이다. 이야기·대화·내 소개 하위 탭은 제거했다. 프로필 변경은 앱 설정의 **내 정보 수정 / プロフィールを編集**에서 열며, 1:1 대화함은 교류 헤더의 아이콘으로 연다.

피드는 언어 필터 없이 모든 회원의 글을 최신순으로 보여준다(차단·이용 제한 정책은 유지). 글쓰기 버튼은 우하단에 고정하고 피드 상단 새로고침 버튼은 제거했다. 맨 위에서 한 손가락으로 아래로 당긴 뒤 놓으면 새 글을 조회한다. 짧은 당김·가로 움직임·취소·스크롤 중간에서 시작한 움직임은 새로고침하지 않는다. 피드 갱신 응답은 최신 요청만 반영한다. 추가 코드는 지연 로딩 영역 안에 있어 초기 JS·CSS에는 추가되지 않는다.

## 게시물 사진

한 글당 사진 2장, 사진만 게시도 가능하다. 선택한 사진은 클라이언트에서 긴 변 1600px 이하 JPEG(품질 0.84)로 변환하고 메타데이터를 제거한다. 원본은 20MB 이하, 변환 결과는 장당 3MB 이하로 제한한다. 지원 입력은 JPEG/PNG/WebP와 해당 WebView에서 디코딩 가능한 HEIC/HEIF다. 미리보기 URL은 메모리에만 유지하고 화면 종료 시 해제한다.

`community-photos`는 비공개 Storage 버킷이다. `community_posts.image_paths`에는 최대 2개의 소유자/게시물별 경로만 저장한다. 업로드는 본인 폴더, 읽기는 본인 또는 RLS상 해당 게시물 열람 가능자, 삭제는 본인의 미참조 파일만 허용한다. 업로드는 덮어쓰지 않고 재시도 시 같은 경로를 사용한다. 사진 조회는 인증 헤더와 캐시 우회 요청을 사용하여 차단 후 이전 CDN 응답이 재사용되지 않도록 한다. 이미지 URL·바이너리는 로컬 피드 캐시에 저장하지 않는다.

게시물 삭제 후 첨부 파일을 정리한다. 실패한 업로드의 임시 파일은 첨부 삭제/화면 종료 시 정리를 시도한다. 오프라인 종료로 정리에 실패한 사진은 서버 정리 작업이 다시 처리한다. 계정 삭제 함수는 해당 계정의 게시·미참조 사진을 모두 Storage API로 정리한 후 계정을 삭제한다. 파일 삭제는 Storage API로만 수행하며 storage.objects를 직접 삭제하지 않는다.

검증: `node --test tests/community-api.test.mjs`, `npx playwright test community.spec.js`, `python3 prototype/scripts/check-community-photo-security.py`. 실제 권한 검증은 임시 계정 2개를 만들고 미게시 사진 숨김, 외부 소유 파일 연결 거부, 2장 제한, 차단 후 접근 거부, 계정 삭제 시 사진 정리를 확인한 뒤 모든 테스트 계정을 삭제한다.


## 사진 정리 예약 작업

- `seodang-community-photo-cleanup`: 서버에서 15분마다 실행하며 Mac이나 앱이 켜져 있을 필요가 없다.
- 게시물 삭제 트리거가 첨부 경로를 `community_private.photo_cleanup_jobs`에 기록한다. 앱의 즉시 삭제 요청이 실패해도 작업은 남는다.
- 업로드 후 24시간 이상 지났고 어떤 글에도 연결되지 않은 사진을 같은 대기열에 추가한다. 업로드 직후의 사진과 게시된 사진은 유지한다.
- Edge Function이 최대 20개씩 Storage API로 지운다. 실패 시 15분부터 최대 6시간까지 간격을 늘려 계속 재시도한다. 실행 중 끊기면 5분짜리 처리 권한이 만료된 뒤 다음 예약 실행에서 재처리한다.
- 게시물 등록과 정리 대상 선정을 같은 DB 잠금으로 조율한다. 삭제 대기 중이거나 이미 없는 사진은 새 글에 연결할 수 없다. 클라이언트는 사진을 다시 첨부하도록 안내한다.
- 대기열과 RPC는 일반/익명 회원에게 공개하지 않는다. 예약 호출은 JWT 검증에 더해 전용 토큰을 확인한다. 토큰은 Vault와 Edge Function 환경변수에만 저장한다. `python3 prototype/scripts/configure-community-photo-cleanup.py`로 설정한다. 토큰을 Git·로그·cron 명령문에 직접 기록하지 않는다.

운영 확인(SQL Editor, 서버 권한):
```sql
select path,reason,attempts,next_attempt_at,last_error
from community_private.photo_cleanup_jobs order by created_at;
select jobname,schedule,active from cron.job
where jobname='seodang-community-photo-cleanup';
select community_private.invoke_photo_cleanup(); -- 필요할 때 즉시 한 번 실행
```

검증: 단위 테스트는 Storage 장애·응답 유실·중복 삭제를 확인한다. `check-community-photo-cleanup.py`는 실제 임시 계정으로 게시물 삭제 대기열, 실패 후 재시도, 지난 처리 권한 무효화, 삭제 중 재게시 차단, 실제 Storage 삭제, 24시간 미만 임시 사진 유지, 일반 회원의 작업 호출 거부를 검사한다. 2026-10-19 서버 검사 18개 통과. 생성한 계정과 사진은 종료 시 제거한다.

보안 진단의 `photo_cleanup_jobs` RLS 정책 없음 안내는 의도된 서버 전용 접근이다. [Supabase 진단 설명](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). 기존 `touch_updated_at`의 search_path 경고는 이번 작업 범위와 무관하며 그대로 남아 있다.
