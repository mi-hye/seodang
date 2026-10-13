# 설정 아이콘 및 휴대폰 TTS

- 설정 아이콘을 톱니 외곽과 중앙 구멍을 가진 SVG로 교체. 공용 settings 아이콘을 사용하는 곳에 모두 적용.
- 학습/복습/단서의 듣기 버튼 활성화. 현재 표현 매니페스트는 device-tts로 명시, 파일 슬롯은 추후 교체 가능하게 보존.
- iOS: SeodangSpeech 로컬 Capacitor 브리지 → AVSpeechSynthesizer. 일본어 ja-JP, 한국어 ko-KR 음성. 새 패키지나 외부 TTS 서비스 없음.
- 웹 fallback: SpeechSynthesis. 이번 작업에서 로컬 브라우저는 실행하지 않음.
- 연속 요청 시 이전 발화 중지, 음소거/화면 이동/pagehide/앱 비활성 시 중지. 음성 없거나 재생 요청 실패하면 안내 표시.
- 기존 사용자가 원한 별도 제작 음성은 미완성이며, 이번 명시 요청에 따라 임시로 휴대폰 TTS를 사용.
- 검증: Node 테스트 7개 통과(일본어 문장/locale 전달, mute, stop, 연속 요청, 오류 포함), iOS 서명 빌드 성공. 기기 음성의 실제 청감 품질은 검증하지 않음.
- 기존 playable 엔트리 JS gzip 13865→14527 bytes, CSS 변동 없음. 새 의존성 없음.

공식 동작 참고: https://developer.apple.com/documentation/avfaudio/avspeechsynthesizer

## 2026-10-12 음성 품질 선택 개선

AVSpeechSynthesisVoice.speechVoices()에서 해당 언어의 설치된 음성을 조회하고 quality 내림차순(프리미엄 → 고품질 → 기본)으로 선택한다. 품질이 같으면 시스템 기본 음성을 유지한다. 음성 목록은 재생할 때마다 조회해 기기 설정에서 추가 다운로드 후에도 반영한다. 다운로드를 앱이 자동 실행하지 않으며, 고품질 음성 설치 여부 및 실제 청감 개선은 확인하지 않았다.

사용자 경로: iPhone 설정 → 손쉬운 사용 → 읽기 및 말하기 → 음성 → 일본어. 기기에서 제공되는 고품질 음성을 다운로드한 뒤 앱에서 다시 재생한다.

공식 참고:
- https://developer.apple.com/documentation/avfaudio/avspeechsynthesisvoicequality
- https://support.apple.com/ko-kr/guide/iphone/iph96b214f0/ios

별도 무료 일본어 합성 대안: VOICEVOX. 사전 생성 파일로 사용할 수 있으나 이번 변경에는 도입하지 않았다. 음성별 이용 조건과 크레디트 필요: https://voicevox.hiroshiba.jp/qa/
