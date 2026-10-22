// Original paired beginner order-correction lesson.
export const orderRepair={
  "ko-ja": {
    "mode": "reply-repair",
    "orderRepair": true,
    "image": "assets/lesson-scenes/cafe-tea-order-v1.jpg",
    "scene": "주문이 다르게 전달됐어요. 차 종류와 잔 수, 포장 여부를 바로잡아 보세요.",
    "items": [
      {
        "text": "温かいお茶ですね。",
        "phrases": [
          "温かい",
          "お茶ですね。"
        ],
        "meaning": "따뜻한 차 맞으시죠?",
        "context": "차가운 차를 주문했는데 직원이 따뜻한 차로 확인해요.",
        "prompt": "차가운 차로 바꿔 말해요.",
        "answer": "冷たいお茶をください。",
        "answerParts": [
          "冷たい",
          "お茶を",
          "ください。"
        ],
        "answerMeaning": "차가운 차 주세요.",
        "others": [
          "温かいお茶をください。",
          "お水をください。"
        ],
        "otherMeanings": [
          "따뜻한 차 주세요.",
          "물 주세요."
        ],
        "hint": "「冷たい」는 ‘차갑다’예요. 「冷たいお茶をください」로 원하는 차를 말해요.",
        "othersFeedback": [
          "따뜻한 차를 달라는 말이에요. 차가운 차를 골라 보세요.",
          "차 대신 물을 달라는 말이에요."
        ],
        "words": [],
        "speaking": {
          "audioFile": "assets/audio/scenarios/ko-ja.15.speak.0.wav"
        },
        "change": "「温かい」 → 「冷たい」"
      },
      {
        "text": "二杯ですね。",
        "phrases": [
          "二杯ですね。"
        ],
        "meaning": "두 잔 맞으시죠?",
        "context": "차를 한 잔 주문했는데 직원이 두 잔으로 확인해요.",
        "prompt": "한 잔만 달라고 말해요.",
        "answer": "一杯だけください。",
        "answerParts": [
          "一杯だけ",
          "ください。"
        ],
        "answerMeaning": "한 잔만 주세요.",
        "others": [
          "二杯ください。",
          "三杯ください。"
        ],
        "otherMeanings": [
          "두 잔 주세요.",
          "세 잔 주세요."
        ],
        "hint": "「一杯」는 한 잔, 「だけ」는 ‘만’이에요. 「一杯だけください」는 한 잔만 달라는 말이에요.",
        "othersFeedback": [
          "두 잔을 달라는 말이에요. 한 잔만 주문해 보세요.",
          "세 잔을 달라는 말이에요."
        ],
        "words": [],
        "speaking": {
          "audioFile": "assets/audio/scenarios/ko-ja.15.speak.1.wav"
        },
        "change": "「二杯」 → 「一杯」"
      },
      {
        "text": "店内でお飲みになりますか。",
        "phrases": [
          "店内で",
          "お飲みに",
          "なりますか。"
        ],
        "meaning": "매장에서 드시나요?",
        "context": "차를 가지고 나가려는데 직원이 매장에서 마실 건지 물어요.",
        "prompt": "가지고 갈 거라고 말해요.",
        "answer": "持ち帰りでお願いします。",
        "answerParts": [
          "持ち帰りで",
          "お願いします。"
        ],
        "answerMeaning": "포장으로 부탁해요.",
        "others": [
          "ここで飲みます。",
          "お茶は要りません。"
        ],
        "otherMeanings": [
          "여기서 마실게요.",
          "차는 필요 없어요."
        ],
        "hint": "「持ち帰り」는 포장이에요. 「でお願いします」를 붙여 포장으로 부탁해요.",
        "othersFeedback": [
          "매장에서 마시겠다는 말이에요.",
          "차가 필요 없다는 말이에요. 포장 여부를 말해 보세요."
        ],
        "words": [],
        "speaking": {
          "audioFile": "assets/audio/scenarios/ko-ja.15.speak.2.wav"
        },
        "change": "「店内」 → 「持ち帰り」"
      }
    ]
  },
  "ja-ko": {
    "mode": "reply-repair",
    "orderRepair": true,
    "image": "assets/lesson-scenes/cafe-tea-order-v1.jpg",
    "scene": "注文が違って伝わっています。お茶の種類、杯数、持ち帰りかどうかを言い直しましょう。",
    "items": [
      {
        "text": "따뜻한 차 맞으세요?",
        "meaning": "温かいお茶でよろしいですか？",
        "context": "冷たいお茶を頼んだのに、店員が温かいお茶だと確認しています。",
        "prompt": "冷たいお茶に言い直しましょう。",
        "answer": "차가운 차 주세요.",
        "answerMeaning": "冷たいお茶をください。",
        "others": [
          "따뜻한 차 주세요.",
          "물 주세요."
        ],
        "otherMeanings": [
          "温かいお茶をください。",
          "水をください。"
        ],
        "hint": "「차가운」は「冷たい」です。「차가운 차 주세요」で飲みたいお茶を伝えます。",
        "othersFeedback": [
          "温かいお茶を頼む言い方です。冷たいお茶を選びましょう。",
          "お茶ではなく水を頼む言い方です。"
        ],
        "words": [],
        "speaking": {
          "audioFile": "assets/audio/scenarios/ja-ko.15.speak.0.wav"
        },
        "change": "「따뜻한」 → 「차가운」"
      },
      {
        "text": "차 두 잔 맞으세요?",
        "meaning": "お茶は二杯でよろしいですか？",
        "context": "お茶を一杯頼んだのに、店員が二杯だと確認しています。",
        "prompt": "一杯だけほしいと伝えましょう。",
        "answer": "한 잔만 주세요.",
        "answerMeaning": "一杯だけください。",
        "others": [
          "두 잔 주세요.",
          "세 잔 주세요."
        ],
        "otherMeanings": [
          "二杯ください。",
          "三杯ください。"
        ],
        "hint": "「한 잔」は一杯、「만」は「だけ」です。「한 잔만 주세요」で一杯だけ頼めます。",
        "othersFeedback": [
          "二杯を頼む言い方です。一杯だけ頼んでみましょう。",
          "三杯を頼む言い方です。"
        ],
        "words": [],
        "speaking": {
          "audioFile": "assets/audio/scenarios/ja-ko.15.speak.1.wav"
        },
        "change": "「두 잔」 → 「한 잔」"
      },
      {
        "text": "매장에서 드시나요?",
        "meaning": "店内でお飲みになりますか？",
        "context": "お茶を持ち帰りたいのに、店員が店内で飲むか聞いています。",
        "prompt": "持ち帰ると伝えましょう。",
        "answer": "포장해 주세요.",
        "answerMeaning": "持ち帰りにしてください。",
        "others": [
          "여기서 마실게요.",
          "차는 필요 없어요."
        ],
        "otherMeanings": [
          "ここで飲みます。",
          "お茶は要りません。"
        ],
        "hint": "「포장해 주세요」は持ち帰りにしてほしいときの言い方です。飲み物にも食べ物にも使えます。",
        "othersFeedback": [
          "店内で飲むと伝える言い方です。",
          "お茶が要らないという意味です。持ち帰りたいと伝えましょう。"
        ],
        "words": [],
        "speaking": {
          "audioFile": "assets/audio/scenarios/ja-ko.15.speak.2.wav"
        },
        "change": "「매장」 → 「포장」"
      }
    ]
  }
};
