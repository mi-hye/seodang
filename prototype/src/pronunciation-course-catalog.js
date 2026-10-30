// Stable lesson IDs preserve completion and review history.
export const pronunciationContentVersion=2;
export const pronunciationCourseCatalog=[
  {
    "id": "15-1",
    "titleParts": [
      "文の中で",
      "母音を練習する"
    ],
    "level": 8,
    "title": "文の中で母音を練習する",
    "count": 6
  },
  {
    "id": "15-2",
    "titleParts": [
      "口の形を",
      "文で練習する"
    ],
    "level": 8,
    "title": "口の形を文で練習する",
    "count": 6
  },
  {
    "id": "15-3",
    "titleParts": [
      "가・카・끼の",
      "出だし"
    ],
    "level": 8,
    "title": "가・카・끼の出だし",
    "count": 6
  },
  {
    "id": "15-4",
    "titleParts": [
      "두・타・따の",
      "出だし"
    ],
    "level": 8,
    "title": "두・타・따の出だし",
    "count": 6
  },
  {
    "id": "15-5",
    "titleParts": [
      "밥・피・빨の",
      "出だし"
    ],
    "level": 8,
    "title": "밥・피・빨の出だし",
    "count": 6
  },
  {
    "id": "15-6",
    "titleParts": [
      "食べ物の文を",
      "続けて言う"
    ],
    "level": 8,
    "title": "食べ物の文を続けて言う",
    "count": 6
  },
  {
    "id": "15-7",
    "titleParts": [
      "あいさつを",
      "続けて言う"
    ],
    "level": 8,
    "title": "あいさつを続けて言う",
    "count": 6
  },
  {
    "id": "15-8",
    "titleParts": [
      "鼻に響く音を",
      "文で練習する"
    ],
    "level": 8,
    "title": "鼻に響く音を文で練習する",
    "count": 6
  },
  {
    "id": "15-9",
    "titleParts": [
      "短い質問を",
      "言ってみる"
    ],
    "level": 8,
    "title": "短い質問を言ってみる",
    "count": 6
  },
  {
    "id": "15-10",
    "titleParts": [
      "パッチムを",
      "次の音へ",
      "つなぐ"
    ],
    "level": 8,
    "title": "パッチムを次の音へつなぐ",
    "count": 6
  }
];
export const isPronunciationCourse=id=>pronunciationCourseCatalog.some(l=>l.id===id);
