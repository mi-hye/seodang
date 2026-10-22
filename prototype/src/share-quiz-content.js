// Original teaching examples, independent of TV/anime dialogue and user records.
export const quizSets={
 'ko-ja':[
  {id:'soft-request',situation:'친구가 창문 옆에 앉아 있어요. 당신이 이렇게 말해요.',line:'ちょっと寒くない？',question:'이 상황에서 담길 수 있는 부탁은?',options:['창문을 닫아 줄래?','날씨 예보를 알려 줄래?','밖에 나갈래?'],answer:0,explanation:'추운지 묻는 말로 창문을 닫아 달라는 부탁을 돌려 전할 수 있어요. 상황 없이 이 문장만 들었다면 단순한 질문일 수도 있어요.'},
  {id:'gentle-decline',situation:'친구가 오늘 저녁에 만나자고 하자 이렇게 답했어요.',line:'今日はちょっと…。',question:'가장 자연스러운 해석은?',options:['조금 늦게 갈게.','오늘은 만나기 어려워.','잠깐만 기다려.'],answer:1,explanation:'제안에 답하며 「ちょっと…」로 말을 흐리면 거절을 부드럽게 전할 때가 있어요. 언제나 「조금」이라는 양만 뜻하는 것은 아니에요.'},
  {id:'checking-understanding',situation:'친구가 출발 시간을 설명했어요. 제대로 이해했는지 확인하려고 해요.',line:'つまり、9時までに着けばいいんだね。',question:'이 말의 목적은?',options:['9시에 도착하라고 명령하기','시간을 더 늦추자고 제안하기','9시까지 도착하면 되는지 확인하기'],answer:2,explanation:'「つまり」로 이해한 내용을 정리하고 「んだね」로 확인해요. 단순히 같은 말을 반복하기보다 상대의 뜻을 제대로 이해했는지 짚는 표현이에요.'}
 ],
 'ja-ko':[
  {id:'soft-request',situation:'友達が窓のそばに座っています。あなたはこう言いました。',line:'조금 춥지 않아?',question:'この場面で含まれるかもしれないお願いは？',options:['窓を閉めてくれる？','天気予報を教えてくれる？','外に出かける？'],answer:0,explanation:'寒さを尋ねる形で、窓を閉めてほしいと遠回しに頼む場合があります。場面が分からなければ、単に寒いか確認している可能性もあります。'},
  {id:'gentle-decline',situation:'今日の夕食に誘われた友達が、こう答えました。',line:'오늘은 좀 어려울 것 같아.',question:'最も自然な受け取り方は？',options:['難しい料理を食べたい。','今日は会うのが難しい。','少し遅れて行く。'],answer:1,explanation:'「어려울 것 같아」は、予定や依頼をやわらかく断るときにも使います。この場面では、料理の難しさではなく都合を伝えています。'},
  {id:'checking-understanding',situation:'集合時間の説明を聞いて、理解が合っているか確かめます。',line:'그러니까 9시까지 도착하면 되는 거지?',question:'この言葉の目的は？',options:['9時に着くよう命令する。','集合を遅らせようと提案する。','9時までに着けばよいか確認する。'],answer:2,explanation:'「그러니까」で聞いた内容をまとめ、「되는 거지?」で理解を確認します。親しい相手との会話で使う言い方です。'}
 ]
};
export function quizRoute(search){const p=new URLSearchParams(search),direction=p.get('direction')==='ja-ko'?'ja-ko':'ko-ja',items=quizSets[direction];return {direction,quiz:items.find(x=>x.id===p.get('q'))||items[0]};}
export function quizShareText(direction,q){return [direction==='ja-ko'?'この言葉、どう聞こえる？ — ソダン':'이 말, 어떻게 들려? — 서당',q.situation,q.line,q.question,...q.options.map((x,i)=>`${i+1}. ${x}`)].join('\n');}
export function publicQuizURL(location,direction,id){
 const url=new URL(location);
 // App-local URLs and local previews are not usable invitations for friends.
 if(url.protocol!=='https:'||url.hostname==='localhost'||url.hostname.endsWith('.localhost')||url.hostname==='com.mihye.seodang'||/^\d+(\.\d+){3}$/.test(url.hostname)||url.hostname.startsWith('['))return null;
 url.search='';url.hash='';url.searchParams.set('direction',direction);url.searchParams.set('q',id);return url.href;
}

export function quizInvitationURL(location,direction,id){return publicQuizURL(location,direction,id)||publicQuizURL('https://mi-hye.github.io/seodang/quiz.html',direction,id);}
