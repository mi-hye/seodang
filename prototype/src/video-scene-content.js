// Level 2 video checks use the existing clip's words and hypothetical everyday situations.
// Keep this content behind the video lesson's lazy-loading boundary.
export const videoSceneContent = {
  'frieren-reaction': {
    meaning: {
      question: '어떤 반응일까요?',
      options: ['이미 알고 있었다고 말해요.', '몰랐던 이야기를 듣고 확인해요.', '상대에게 기다려 달라고 해요.'],
      answer: 1,
      explanation: '「そうなの？」는 몰랐던 이야기를 듣고 「그래?」 하고 되묻는 말이에요.',
    },
    use: {
      question: '어느 때 이 말을 쓸까요?',
      options: ['친구에게 작별 인사를 할 때', '친구에게 조용히 해 달라고 할 때', '친구가 이사 간다는 말을 처음 들었을 때'],
      answer: 2,
      explanation: '친구의 새로운 소식을 듣고 「そうなの？」라고 반응할 수 있어요. 친한 사이에서 쓰는 말투예요.',
    },
  },
  'hospital-reassurance': {
    meaning: {
      question: 'この言葉の意味は？',
      options: ['大丈夫です。', '急いでください。', '疲れました。'],
      answer: 0,
      explanation: '「괜찮아요」は「大丈夫です」という意味です。何かを断るときにも使うので、場面に合わせて受け取ります。',
    },
    use: {
      question: '相手を安心させるなら、どんなとき？',
      options: ['待ち合わせに遅れると連絡するとき', '体調を心配されたけれど、問題ないとき', '初めて会った人に名前を伝えるとき'],
      answer: 1,
      explanation: '心配してくれた相手に「괜찮아요」と答えると、自分は大丈夫だと伝えられます。',
    },
  },
  'frieren-wait': {
    meaning: {
      question: '무엇을 부탁하는 말일까요?',
      options: ['조금 빨리 와 주세요.', '나중에 연락해 주세요.', '잠깐 기다려 주세요.'],
      answer: 2,
      explanation: '「待ってください」는 기다려 달라는 부탁이에요. 여기서 「ちょっと」는 잠깐이라는 뜻이에요.',
    },
    use: {
      question: '어느 때 이 말을 쓸까요?',
      options: ['계산할 때 지갑을 꺼낼 시간이 필요할 때', '직원에게 계산이 끝났다고 말할 때', '친구에게 내일 만나자고 할 때'],
      answer: 0,
      explanation: '지갑을 꺼내는 동안 「ちょっと待ってください。」라고 하면 잠깐 기다려 달라는 부탁이 돼요.',
    },
  },
  'hospital-effort': {
    meaning: {
      question: 'どんな気持ちを伝える言葉ですか？',
      options: ['もう十分に頑張りました。', 'これから精いっぱい頑張ります。', '別の人に任せたいです。'],
      answer: 1,
      explanation: '「최선을 다할게요」は、これからベストを尽くすと相手に伝える言葉です。',
    },
    use: {
      question: 'この言葉が合うのは、どんなとき？',
      options: ['終わった仕事の成果を報告するとき', '難しいので仕事を断るとき', '任された仕事に一生懸命取り組むと伝えるとき'],
      answer: 2,
      explanation: '仕事を任されたときに「최선을 다할게요」と言うと、精いっぱい取り組む気持ちが伝わります。',
    },
  },
  'frieren-just-right': {
    meaning: {
      question: '누가 무엇을 하겠다는 말일까요?',
      options: ['내가 만들겠다고 말해요.', '상대에게 만들어 달라고 해요.', '이미 다 만들었다고 말해요.'],
      answer: 0,
      explanation: '「作るね。」는 내가 만들겠다고 알려 주는 말이에요. 끝에 「ね」를 붙여 부드럽게 말해요.',
    },
    use: {
      question: '어느 때 이 말을 쓸까요?',
      options: ['친구에게 방금 다 만들었다고 말할 때', '친구에게 내가 음식을 만들겠다고 말할 때', '친구에게 음식을 만들어 달라고 부탁할 때'],
      answer: 1,
      explanation: '친구와 먹을 음식을 내가 만들려고 할 때 쓸 수 있어요. 상대에게 만들어 달라는 부탁은 아니에요.',
    },
  },
  'hospital-appreciation': {
    meaning: {
      question: 'この言葉は何を伝えていますか？',
      options: ['これからの予定を尋ねています。', 'もっと頑張ってほしいと頼んでいます。', '相手の苦労や頑張りをねぎらっています。'],
      answer: 2,
      explanation: '「고생 많으셨어요」は、大変なことを終えた相手をねぎらう丁寧な言葉です。',
    },
    use: {
      question: 'この言葉が合うのは、どんなとき？',
      options: ['忙しい仕事を終えた同僚に声をかけるとき', '初めて会う人に自己紹介するとき', 'まだ仕事を始めていない人を励ますとき'],
      answer: 0,
      explanation: '忙しい仕事を終えた相手に、その頑張りをねぎらって言います。ただの別れのあいさつとは少し違います。',
    },
  },
  'chiikawa-offer': {
    meaning: {
      question: '상대에게 무엇을 물었나요?',
      options: ['라면을 만들어 줄 수 있는지', '라면을 먹고 싶은지', '라면을 어디서 샀는지'],
      answer: 1,
      explanation: '「食べる？」를 붙여 먹을지 물어요. 이 장면에서는 라면을 권해요.',
    },
    use: {
      question: '음식 이름을 바꿔서 쓴다면?',
      options: ['직원에게 음식 가격을 물을 때', '친구에게 식당 위치를 물을 때', '친구에게 간식을 먹을지 물을 때'],
      answer: 2,
      explanation: '주먹밥을 권하고 싶다면 「おにぎり食べる？」라고 해요. 친한 사이에서 음식 이름을 바꿔 쓸 수 있어요.',
    },
  },
  'hospital-thanks': {
    meaning: {
      question: '何にお礼を言っていますか？',
      options: ['機会をもらったこと', '予定を教えてもらったこと', '名前を覚えてもらったこと'],
      answer: 0,
      explanation: '「기회」は機会です。「주셔서 감사합니다」で、くださったことへのお礼を伝えています。',
    },
    use: {
      question: '同じ言葉でお礼を言うなら、どんなとき？',
      options: ['会議の開始時間を尋ねるとき', '発表する機会をもらったとき', '飲み物を注文するとき'],
      answer: 1,
      explanation: '「기회 주셔서 감사합니다」は、発表などの機会をもらったときのお礼です。何へのお礼かを具体的に伝えられます。',
    },
  },
};
