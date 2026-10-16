# 서당개 에셋 출처

기존 서당 앱의 `src/domain/pet/pixelDog.ts`에 있는 `getDogSprite(1, false)` 출력을 사용합니다. `src/components/learning/LearningStartScreen.tsx`에서 사용하는 기본 단계(24px)와 같습니다.

원본 SHA-256: `4f1c2cb289c11ff16fd41d049e8568f0d1009ec42e0a5f70e75cb0ace23baf95`

`scripts/import-dog.mjs`로 생성했습니다. 픽셀의 위치·색상을 바꾸지 않고 몸·머리·눈·입·꼬리 레이어로 분리했습니다. 웹 CSS 반응만 추가했습니다. 원본 파일은 수정하지 않았습니다. 생성된 JSON을 프로젝트 안에 포함하므로 다른 컴퓨터에서 실행할 때 부모 앱이 필요하지 않습니다. 재생성할 때만 원본 저장소가 필요합니다.
