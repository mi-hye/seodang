// Original paired level 2-8 shop conversations.
export const shopConversation={
  "ko-ja": {
    "image": "assets/lesson-scenes/stationery-shop-v1.jpg",
  "scene": "문구점에서 공책을 골라요. 원하는 물건이 있는지 묻고 다른 색도 찾아보세요.",
    "items": [
      {
        "text": "すみません、ノートはありますか。\nはい、こちらです。",
        "phrases": [
          "すみません、",
          "ノートは",
          "ありますか。",
          "\n",
          "はい、",
          "こちらです。"
        ],
        "meaning": "저기요, 공책 있어요?\n네, 여기 있어요.",
        "prompt": "공책을 찾고 있어요. 직원에게 물어봐요.",
        "answer": "ノートはありますか。",
        "others": [
          "ノートはいくらですか。",
          "ノートは何色ですか。"
        ],
        "hint": "물건 이름 뒤에 はありますか를 붙이면 그 물건이 있는지 물을 수 있어요.",
        "words": [
          [
            "ノート",
            "공책"
          ],
          [
            "ありますか",
            "있나요?"
          ]
        ],
        "speaking": {
          "phrases": [
            "ノートは",
            "ありますか。"
          ],
          "audioFile": "assets/audio/scenarios/ko-ja.13.speak.0.wav"
        }
      },
      {
        "text": "赤いノートはこちらです。\n青いノートもありますか。",
        "phrases": [
          "赤いノートは",
          "こちらです。",
          "\n",
          "青いノートも",
          "ありますか。"
        ],
        "meaning": "빨간 공책은 여기 있어요.\n파란 공책도 있어요?",
        "prompt": "빨간 공책 말고 파란 공책도 있는지 물어봐요.",
        "answer": "青いノートもありますか。",
        "others": [
          "赤いノートをください。",
          "ノートはいくらですか。"
        ],
        "hint": "も는 ‘도’라는 뜻이에요. 青いノートもありますか로 파란 공책도 있는지 물어요.",
        "words": [
          [
            "赤い",
            "빨갛다"
          ],
          [
            "青い",
            "파랗다"
          ]
        ],
        "speaking": {
          "phrases": [
            "青いノートも",
            "ありますか。"
          ],
          "audioFile": "assets/audio/scenarios/ko-ja.13.speak.1.wav"
        }
      },
      {
        "text": "こちらのノートはいかがですか。\nじゃあ、これをください。",
        "phrases": [
          "こちらのノートは",
          "いかがですか。",
          "\n",
          "じゃあ、",
          "これをください。"
        ],
        "meaning": "이 공책은 어떠세요?\n그럼 이걸 주세요.",
        "prompt": "직원이 보여 준 공책이 마음에 들어요. 이걸 사겠다고 말해요.",
        "answer": "じゃあ、これをください。",
        "others": [
          "ほかの色はありますか。",
          "ノートはどこですか。"
        ],
        "hint": "물건을 가리키며 これをください라고 하면 ‘이걸 주세요’라는 뜻이에요.",
        "words": [
          [
            "じゃあ",
            "그럼"
          ],
          [
            "これ",
            "이것"
          ]
        ],
        "speaking": {
          "phrases": [
            "じゃあ、",
            "これをください。"
          ],
          "audioFile": "assets/audio/scenarios/ko-ja.13.speak.2.wav"
        }
      }
    ]
  },
  "ja-ko": {
    "image": "assets/lesson-scenes/stationery-shop-v1.jpg",
  "scene": "文房具店でノートを選びます。欲しい物があるか尋ねて、別の色も探してみましょう。",
    "items": [
      {
        "text": "저기요, 공책 있어요?\n네, 여기 있어요.",
        "meaning": "すみません、ノートはありますか。\nはい、こちらです。",
        "prompt": "ノートを探しています。店員に尋ねましょう。",
        "answer": "공책 있어요?",
        "others": [
          "공책 얼마예요?",
          "공책 무슨 색이에요?"
        ],
        "hint": "物の名前に「있어요?」を続けると、その物があるか尋ねられます。",
        "words": [
          [
            "공책",
            "ノート"
          ],
          [
            "있어요?",
            "ありますか"
          ]
        ],
        "speaking": {
          "phrases": [
            "공책 ",
            "있어요?"
          ],
          "audioFile": "assets/audio/scenarios/ja-ko.13.speak.0.wav"
        }
      },
      {
        "text": "빨간 공책은 여기 있어요.\n파란 공책도 있어요?",
        "meaning": "赤いノートはこちらです。\n青いノートもありますか。",
        "prompt": "赤ではなく、青いノートもあるか尋ねましょう。",
        "answer": "파란 공책도 있어요?",
        "others": [
          "빨간 공책 주세요.",
          "공책 얼마예요?"
        ],
        "hint": "「도」は「も」の意味です。「공책도」のように、名詞に続けて使います。",
        "words": [
          [
            "빨간",
            "赤い"
          ],
          [
            "파란",
            "青い"
          ]
        ],
        "speaking": {
          "phrases": [
            "파란 ",
            "공책도 ",
            "있어요?"
          ],
          "audioFile": "assets/audio/scenarios/ja-ko.13.speak.1.wav"
        }
      },
      {
        "text": "이 공책은 어때요?\n그럼 이걸로 주세요.",
        "meaning": "このノートはいかがですか。\nでは、これをください。",
        "prompt": "店員が見せてくれたノートが気に入りました。これにすると伝えましょう。",
        "answer": "그럼 이걸로 주세요.",
        "others": [
          "다른 색도 있어요?",
          "공책 어디 있어요?"
        ],
        "hint": "「이걸로 주세요」は、見せてもらった物を選んで買うときに使います。",
        "words": [
          [
            "그럼",
            "では"
          ],
          [
            "이걸로",
            "これに"
          ]
        ],
        "speaking": {
          "phrases": [
            "그럼 ",
            "이걸로 ",
            "주세요."
          ],
          "audioFile": "assets/audio/scenarios/ja-ko.13.speak.2.wav"
        }
      }
    ]
  }
};
