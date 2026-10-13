export const course = {
  id: "ko-ja",
  guideLocale: "ko-KR",
  learningLocale: "ja-JP",
  status: "provisional",
};
export const expressions = [
  {
    id: "blue-bag",
    image: { src: "assets/word-blue-bag-v1.png", alt: "카페 의자 위의 파란 가방" },
    text: "あおい かばん",
    natural: "あおいかばん",
    meaning: "파란 가방",
    reading: "aoi kaban",
    parts: [
      ["あおい", "파란"],
      ["かばん", "가방"],
    ],
    help: "あ는 ‘아’, お는 ‘오’, い는 ‘이’로 읽어요. あおい는 파란색을 나타내요.",
  },
  {
    id: "near-window",
    image: { src: "assets/word-near-window-v1.png", alt: "창문 바로 옆 의자 위에 놓인 가방" },
    text: "まどの そば",
    natural: "まどのそば",
    meaning: "창문 옆 · 창문 가까이",
    reading: "mado no soba",
    parts: [
      ["まど", "창문"],
      ["〜の そば", "~의 옆, 가까이"],
    ],
    help: "ま는 ‘마’, ど는 ‘도’로 읽어요. まど는 창문, の는 말을 연결하고, そば는 옆이나 가까이를 뜻해요.",
  },
];
export const episode = {
  id: "case-01",
  version: 1,
  title: "카페에 남겨진 가방",
  intro: [
    {
      speaker: "카페 직원",
      audioId: "case01.staff-intro.ja",
      japanese: "お客様がかばんを忘れていきました。取りにいらっしゃる前に、どのかばんか確認していただけますか。",
      text: "손님이 가방을 두고 가셨어요. 찾으러 오시기 전에 어느 가방인지 확인해 주실래요?",
    },
    {
      speaker: "학습 안내",
      text: "손님이 남긴 메모를 읽고 가방을 찾아요. 먼저 색과 위치를 나타내는 표현 두 개를 배워요.",
    },
  ],
  objects: [
    {
      id: "bag-window-red",
      color: "red",
      place: "center",
      label: "가운데 빨간 가방",
    },
    {
      id: "bag-door-blue",
      color: "blue",
      place: "door",
      label: "문 옆 파란 가방",
    },
    {
      id: "bag-window-blue",
      color: "blue",
      place: "window",
      label: "창문 옆 파란 가방",
    },
  ],
  clues: [
    {
      id: "color",
      expressionId: "blue-bag",
      title: "가방의 색",
      text: "あおい かばん",
    },
    {
      id: "position",
      expressionId: "near-window",
      title: "가방의 위치",
      text: "まどの そば",
    },
  ],
  hints: [
    "색을 나타내는 あおい와 위치를 나타내는 まどの そば를 함께 봐요.",
    "あおい는 파란, まど는 창문이에요. そば는 옆이나 가까이라는 뜻이에요.",
    "창문 옆에 있는 파란 가방이 두 조건을 모두 만족해요.",
  ],
  transfer: {
    prompt: "まどの そば",
    objects: [
      { id: "book", label: "문 옆의 책", place: "door", symbol: "book" },
      { id: "cup", label: "창문 옆의 컵", place: "window", symbol: "cup" },
      {
        id: "plant",
        label: "방 가운데 화분",
        place: "center",
        symbol: "plant",
      },
    ],
    answer: "cup",
  },
};
