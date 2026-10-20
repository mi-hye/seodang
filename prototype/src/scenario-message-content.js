// Level 4-5: compose a reply from meaningful clauses.
export const scheduleMessages={
 "ko-ja": {
  "mode": "message-builder",
  "scene": "일정이 바뀌었어요. 받은 메시지를 읽고 말 조각을 눌러 답장을 완성해 보세요. 고른 조각을 다시 누르면 뺄 수 있어요.",
  "items": [
   {
    "text": "三時に駅の前で待っています。",
    "phrases": [
     "三時に",
     "駅の前で",
     "待っています。"
    ],
    "meaning": "세 시에 역 앞에서 기다릴게요.",
    "prompt": "전철이 늦어지고 있어요. 이유를 먼저 말하고 약속을 세 시 반으로 바꿔도 되는지 물어요.",
    "parts": [
     "電車が|遅れているので、",
     "待ち合わせを|三時半に",
     "変更しても|いいですか。"
    ],
    "answer": "電車が遅れているので、待ち合わせを三時半に変更してもいいですか。",
    "answerMeaning": "전철이 늦어지고 있어서 약속을 세 시 반으로 바꿔도 될까요?",
    "hint": "ので로 이유를 먼저 말하고 변경할 시간, 부탁 순서로 이어 보세요.",
    "words": [],
    "speaking": {
     "audioFile": "assets/audio/scenarios/ko-ja.9.speak.0.wav"
    },
    "others": []
   },
   {
    "text": "土曜日は予約がいっぱいです。別の日はいかがですか。",
    "phrases": [
     "土曜日は",
     "予約が",
     "いっぱいです。",
     "別の日は",
     "いかがですか。"
    ],
    "meaning": "토요일은 예약이 꽉 찼습니다. 다른 날은 어떠세요?",
    "prompt": "토요일이 어렵다면 일요일 오후로 바꿀 수 있는지 물어요.",
    "parts": [
     "もし|土曜日が|難しければ、",
     "日曜日の|午後に",
     "変更できますか。"
    ],
    "answer": "もし土曜日が難しければ、日曜日の午後に変更できますか。",
    "answerMeaning": "토요일이 어렵다면 일요일 오후로 변경할 수 있나요?",
    "hint": "もし〜ければ는 조건을 나타내요. 조건 뒤에 다른 날짜를 제안해요.",
    "words": [],
    "speaking": {
     "audioFile": "assets/audio/scenarios/ko-ja.9.speak.1.wav"
    },
    "others": []
   },
   {
    "text": "予定が決まったら連絡していただけますか。",
    "phrases": [
     "予定が",
     "決まったら",
     "連絡して",
     "いただけますか。"
    ],
    "meaning": "일정이 정해지면 연락해 주실 수 있나요?",
    "prompt": "시간이 정해지는 대로 내가 다시 연락하겠다고 답해요.",
    "parts": [
     "時間が|決まり次第、",
     "こちらから|改めて",
     "ご連絡します。"
    ],
    "answer": "時間が決まり次第、こちらから改めてご連絡します。",
    "answerMeaning": "시간이 정해지는 대로 제가 다시 연락드리겠습니다.",
    "hint": "決まり次第는 정해지는 대로라는 뜻이에요. こちらから는 내가 먼저 연락하겠다는 말이에요.",
    "words": [],
    "speaking": {
     "audioFile": "assets/audio/scenarios/ko-ja.9.speak.2.wav"
    },
    "others": []
   }
  ]
 },
 "ja-ko": {
  "mode": "message-builder",
  "scene": "予定が変わりました。届いたメッセージを読み、言葉のパーツを押して返事を作りましょう。選んだパーツをもう一度押すと戻せます。",
  "items": [
   {
    "text": "세 시에 역 앞에서 기다릴게요.",
    "phrases": null,
    "meaning": "三時に駅の前で待っています。",
    "prompt": "電車が遅れています。理由を先に伝え、待ち合わせを三時半に変えてよいか尋ねましょう。",
    "parts": [
     "전철이 늦어지고 있어서 ",
     "약속 시간을 세 시 반으로 ",
     "바꿔도 될까요?"
    ],
    "answer": "전철이 늦어지고 있어서 약속 시간을 세 시 반으로 바꿔도 될까요?",
    "answerMeaning": "電車が遅れているので、待ち合わせを三時半に変えてもいいですか。",
    "hint": "「~어서」で理由を伝えます。変更したい時間を続け、最後に「바꿔도 될까요?」で許可を求めます。",
    "words": [],
    "speaking": {
     "audioFile": "assets/audio/scenarios/ja-ko.9.speak.0.wav"
    },
    "others": []
   },
   {
    "text": "토요일은 예약이 꽉 찼어요. 다른 날은 어떠세요?",
    "phrases": null,
    "meaning": "土曜日は予約がいっぱいです。別の日はいかがですか。",
    "prompt": "土曜日が難しければ、日曜日の午後に変更できるか尋ねましょう。",
    "parts": [
     "토요일이 어렵다면 ",
     "일요일 오후로 ",
     "변경할 수 있을까요?"
    ],
    "answer": "토요일이 어렵다면 일요일 오후로 변경할 수 있을까요?",
    "answerMeaning": "土曜日が難しければ、日曜日の午後に変更できますか。",
    "hint": "「~다면」で条件を示します。「~로」で変更先を伝え、最後にできるか尋ねます。",
    "words": [],
    "speaking": {
     "audioFile": "assets/audio/scenarios/ja-ko.9.speak.1.wav"
    },
    "others": []
   },
   {
    "text": "일정이 정해지면 연락해 주실 수 있나요?",
    "phrases": null,
    "meaning": "予定が決まったら連絡していただけますか。",
    "prompt": "時間が決まり次第、自分から改めて連絡すると伝えましょう。",
    "parts": [
     "시간이 정해지는 대로 ",
     "제가 다시 ",
     "연락드리겠습니다."
    ],
    "answer": "시간이 정해지는 대로 제가 다시 연락드리겠습니다.",
    "answerMeaning": "時間が決まり次第、私から改めてご連絡します。",
    "hint": "「~는 대로」は「~するとすぐに」です。「연락드리겠습니다」は「連絡します」の丁寧な言い方です。",
    "words": [],
    "speaking": {
     "audioFile": "assets/audio/scenarios/ja-ko.9.speak.2.wav"
    },
    "others": []
   }
  ]
 }
};
