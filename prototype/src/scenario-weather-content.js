// Original paired beginner listening lesson.
export const weatherPreparation={
  "ko-ja": {
    "mode": "listening-intent",
    "weather": true,
    "image": "assets/lesson-scenes/weather-bag-v1.jpg",
    "scene": "외출 전에 친구가 준비할 것을 알려 줘요. 날씨 안내를 듣고 부탁한 준비를 골라 보세요.",
    "items": [
      {
        "text": "今日は雨です。傘を持ってきてください。",
        "meaning": "오늘은 비가 와요. 우산을 가져오세요.",
        "answer": "傘を持っていきます。",
        "answerMeaning": "우산을 가져가요.",
        "hint": "「雨」는 비, 「傘」는 우산이에요. 우산을 가져오라는 말을 들었어요.",
        "others": [
          "上着を着ます。",
          "水を持っていきます。"
        ],
        "otherMeanings": [
          "겉옷을 입어요.",
          "물을 가져가요."
        ],
        "context": "친구를 만나러 나갈 준비를 해요.",
        "prompt": "친구가 부탁한 준비를 골라요.",
        "words": [],
        "speaking": {
          "audioFile": "assets/audio/scenarios/ko-ja.16.speak.0.wav"
        },
        "phrases": [
          "今日は",
          "雨です。",
          "傘を",
          "持ってきて",
          "ください。"
        ],
        "answerParts": [
          "傘を",
          "持っていきます。"
        ]
      },
      {
        "text": "今日は寒いです。上着を着てきてください。",
        "meaning": "오늘은 추워요. 겉옷을 입고 오세요.",
        "answer": "上着を着ます。",
        "answerMeaning": "겉옷을 입어요.",
        "hint": "「寒い」는 춥다, 「上着」는 겉옷이에요. 겉옷을 입고 오라는 말을 들었어요.",
        "others": [
          "傘を持っていきます。",
          "水を持っていきます。"
        ],
        "otherMeanings": [
          "우산을 가져가요.",
          "물을 가져가요."
        ],
        "context": "친구를 만나러 나갈 준비를 해요.",
        "prompt": "친구가 부탁한 준비를 골라요.",
        "words": [],
        "speaking": {
          "audioFile": "assets/audio/scenarios/ko-ja.16.speak.1.wav"
        },
        "phrases": [
          "今日は",
          "寒いです。",
          "上着を",
          "着てきて",
          "ください。"
        ],
        "answerParts": [
          "上着を",
          "着ます。"
        ]
      },
      {
        "text": "今日は暑いです。水を持ってきてください。",
        "meaning": "오늘은 더워요. 물을 가져오세요.",
        "answer": "水を持っていきます。",
        "answerMeaning": "물을 가져가요.",
        "hint": "「暑い」는 덥다, 「水」는 물이에요. 물을 가져오라는 말을 들었어요.",
        "others": [
          "傘を持っていきます。",
          "上着を着ます。"
        ],
        "otherMeanings": [
          "우산을 가져가요.",
          "겉옷을 입어요."
        ],
        "context": "친구를 만나러 나갈 준비를 해요.",
        "prompt": "친구가 부탁한 준비를 골라요.",
        "words": [],
        "speaking": {
          "audioFile": "assets/audio/scenarios/ko-ja.16.speak.2.wav"
        },
        "phrases": [
          "今日は",
          "暑いです。",
          "水を",
          "持ってきて",
          "ください。"
        ],
        "answerParts": [
          "水を",
          "持っていきます。"
        ]
      }
    ]
  },
  "ja-ko": {
    "mode": "listening-intent",
    "weather": true,
    "image": "assets/lesson-scenes/weather-bag-v1.jpg",
    "scene": "出かける前に、友達が準備する物を教えてくれます。天気の案内を聞いて、頼まれた準備を選びましょう。",
    "items": [
      {
        "text": "오늘은 비가 와요. 우산을 가져오세요.",
        "meaning": "今日は雨です。傘を持ってきてください。",
        "answer": "우산을 가져가요.",
        "answerMeaning": "傘を持っていきます。",
        "hint": "「비」は雨、「우산」は傘です。傘を持ってくるように頼まれました。",
        "others": [
          "겉옷을 입어요.",
          "물을 가져가요."
        ],
        "otherMeanings": [
          "上着を着ます。",
          "水を持っていきます。"
        ],
        "context": "友達に会いに出かける準備をしています。",
        "prompt": "友達に頼まれた準備を選びましょう。",
        "words": [],
        "speaking": {
          "audioFile": "assets/audio/scenarios/ja-ko.16.speak.0.wav"
        }
      },
      {
        "text": "오늘은 추워요. 겉옷을 입고 오세요.",
        "meaning": "今日は寒いです。上着を着てきてください。",
        "answer": "겉옷을 입어요.",
        "answerMeaning": "上着を着ます。",
        "hint": "「추워요」は寒い、「겉옷」は上着です。上着を着てくるように頼まれました。",
        "others": [
          "우산을 가져가요.",
          "물을 가져가요."
        ],
        "otherMeanings": [
          "傘を持っていきます。",
          "水を持っていきます。"
        ],
        "context": "友達に会いに出かける準備をしています。",
        "prompt": "友達に頼まれた準備を選びましょう。",
        "words": [],
        "speaking": {
          "audioFile": "assets/audio/scenarios/ja-ko.16.speak.1.wav"
        }
      },
      {
        "text": "오늘은 더워요. 물을 가져오세요.",
        "meaning": "今日は暑いです。水を持ってきてください。",
        "answer": "물을 가져가요.",
        "answerMeaning": "水を持っていきます。",
        "hint": "「더워요」は暑い、「물」は水です。水を持ってくるように頼まれました。",
        "others": [
          "우산을 가져가요.",
          "겉옷을 입어요."
        ],
        "otherMeanings": [
          "傘を持っていきます。",
          "上着を着ます。"
        ],
        "context": "友達に会いに出かける準備をしています。",
        "prompt": "友達に頼まれた準備を選びましょう。",
        "words": [],
        "speaking": {
          "audioFile": "assets/audio/scenarios/ja-ko.16.speak.2.wav"
        }
      }
    ]
  }
};
