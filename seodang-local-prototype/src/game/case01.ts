import type { ChallengeDefinition, ChallengeId, Step } from "./types";
export const intro = [
  "첫 수업에 쓸 도장이 서랍 안에 있어.",
  "그런데 열쇠가 안 보이네.",
  "책상에 쪽지가 있어. 같이 읽어 보자.",
];
export const ending = [
  "찾았다. 이제 수업을 시작할 수 있겠네.",
  "네가 읽은 단서 덕분이야.",
];
export const objectives: Record<Step, string> = {
  intro: "서당개의 이야기를 들어 보자",
  seek_note: "책상 위 쪽지를 읽어 보자",
  seek_shelf: "선반 위를 살펴보자",
  seek_box: "파란 상자를 열어 열쇠를 찾자",
  use_key: "열쇠로 책상 서랍을 열자",
  ending: "서랍 속 도장을 확인하자",
  complete: "첫 수업을 위한 준비 완료",
};
export const challenges: Record<ChallengeId, ChallengeDefinition> = {
  "shelf-note": {
    id: "shelf-note",
    original: "棚の上を見てください。",
    reading: "たなのうえをみてください。",
    translation: "선반 위를 봐 주세요.",
    prompt: "다음에는 어디를 살펴볼까?",
    choices: [
      { id: "a", text: "책상 아래" },
      { id: "b", text: "선반 위" },
      { id: "c", text: "창문 옆" },
    ],
    correctChoiceId: "b",
    correctFeedback: "선반 위를 보라는 뜻이야. 직접 살펴보자.",
    wrongFeedback: "上는 ‘위’라는 뜻이야. 무엇의 위인지 다시 보자.",
    hint: "棚는 ‘선반’, 上는 ‘위’야.",
  },
  "box-note": {
    id: "box-note",
    original: "青い箱の中に鍵があります。",
    reading: "あおいはこのなかにかぎがあります。",
    translation: "파란 상자 안에 열쇠가 있어요.",
    prompt: "열쇠는 어디에 있을까?",
    choices: [
      { id: "a", text: "파란 상자 안" },
      { id: "b", text: "파란 상자 위" },
      { id: "c", text: "책상 아래" },
    ],
    correctChoiceId: "a",
    correctFeedback: "파란 상자 안에 열쇠가 있대. 상자를 열어 보자.",
    wrongFeedback: "中는 ‘안’을 뜻해. 상자의 어느 쪽인지 다시 읽어 보자.",
    hint: "青い는 ‘파란’, 箱는 ‘상자’, 中는 ‘안’, 鍵는 ‘열쇠’야.",
  },
};
