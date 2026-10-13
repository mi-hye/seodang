export const dialogueTurns=[
 {id:'order',question:'ご注文はお決まりですか。',questionMeaning:'주문하시겠어요?',reply:'コーヒーをひとつください。',replyMeaning:'커피 한 잔 주세요.',help:'원하는 것 뒤에 をひとつください를 붙여 하나를 부탁해요.',choices:['コーヒーをひとつください。','紅茶をひとつください。','水をひとつください。'],order:[1,0,2]},
 {id:'temperature',question:'ホットとアイス、どちらになさいますか。',questionMeaning:'따뜻한 것과 차가운 것 중 어느 쪽으로 하시겠어요?',reply:'ホットでお願いします。',replyMeaning:'따뜻한 것으로 주세요.',help:'선택한 말 뒤에 でお願いします를 붙여 요청해요.',choices:['ホットでお願いします。','アイスでお願いします。','常温でお願いします。'],order:[2,1,0]},
 {id:'takeaway',question:'店内でお召し上がりですか。',questionMeaning:'매장에서 드시나요?',reply:'持ち帰りでお願いします。',replyMeaning:'포장해 주세요.',help:'持ち帰り는 포장이에요. 매장에서 먹을 때는 店内でお願いします라고 해요.',choices:['持ち帰りでお願いします。','店内でお願いします。','もうひとつお願いします。'],order:[0,2,1]},
];
export const dialogueAudio=Object.fromEntries(dialogueTurns.flatMap(t=>[['question',t.question],['reply',t.reply]].map(([role,text])=>{const id=`${t.id}-${role}`;return [id,{id:`level4.${id}`,text,locale:'ja-JP',status:'ready',audioFile:`assets/audio/dialogue/${id}.wav`,voiceStyleId:10005,productionMethod:'VOICEVOX Nemo'}];})));
