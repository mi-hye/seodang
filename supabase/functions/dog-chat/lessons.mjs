// Shared, curated context for the optional post-lesson conversation.
// Learner replies are examples, never an exhaustive list of correct answers.
// Keep the source expressions identical to the completed lesson. Do not add
// distractors: every suggested reply must be a valid reply in this context.
const turn=(prompt,meaning,choices,hint)=>({
 prompt,meaning,choices:choices.map(([text,meaning])=>({text,meaning})),
 accepted:choices.map(([text])=>text),hint,
});

export const dogChatLessons={
 'ko-ja:sentence:3':{
  key:'ko-ja:sentence:3',title:'교류회에서 자기소개하기',
  targetLanguage:'ja',nativeLanguage:'ko',level:2,
  learnedExpressions:[
   '私は学生です。','私は韓国人です。','日本語を勉強しています。',
   'ソウルに住んでいます。','コーヒーが好きです。','明日は時間があります。',
  ],
  turns:[
   turn('はじめまして。自己紹介をお願いします。','처음 뵙겠습니다. 자기소개해 주세요.',[
    ['私は学生です。','저는 학생이에요.'],
    ['私は韓国人です。','저는 한국 사람이에요.'],
   ],'학생인지, 어느 나라 사람인지 말해 봐요. 배운 예문으로 답해도 좋아요.'),
   turn('どこに住んでいますか。','어디에 살고 있나요?',[
    ['ソウルに住んでいます。','서울에 살아요.'],
   ],'사는 도시를 말해 봐요. 예문 속 서울로 답해도 좋아요.'),
   turn('好きな飲み物は何ですか。','어떤 음료를 좋아하나요?',[
    ['コーヒーが好きです。','커피를 좋아해요.'],
   ],'좋아하는 음료를 말해 봐요. 수업에서는 커피를 좋아한다고 했어요.'),
  ],
 },
 'ja-ko:korean:3-1':{
  key:'ja-ko:korean:3-1',title:'交流会で自己紹介する',
  targetLanguage:'ko',nativeLanguage:'ja',level:2,
  learnedExpressions:[
   '저는 학생이에요.','저는 일본 사람이에요.','한국어를 공부해요.',
   '도쿄에 살아요.','커피를 좋아해요.','내일 시간이 있어요.',
  ],
  turns:[
   turn('만나서 반가워요. 자기소개해 주세요.','会えてうれしいです。自己紹介をお願いします。',[
    ['저는 학생이에요.','私は学生です。'],
    ['저는 일본 사람이에요.','私は日本人です。'],
   ],'学生か、どの国の出身かを伝えてみましょう。習った例文で答えても大丈夫です。'),
   turn('어디에 살아요?','どこに住んでいますか？',[
    ['도쿄에 살아요.','東京に住んでいます。'],
   ],'住んでいる町を伝えてみましょう。例文の東京で答えても大丈夫です。'),
   turn('어떤 음료를 좋아해요?','どんな飲み物が好きですか？',[
    ['커피를 좋아해요.','コーヒーが好きです。'],
   ],'好きな飲み物を伝えてみましょう。レッスンでは、コーヒーが好きだと話しました。'),
  ],
 },
};
