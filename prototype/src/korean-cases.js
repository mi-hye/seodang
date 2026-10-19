import {extraKoreanCases} from './level-two-content.js';
import {esc,phraseText,button,bag,icon} from './ui.js';
export const koreanCases={
 '3-1':{image:'assets/lesson-scenes/language-exchange-v1.jpg',title:'交流会で自己紹介する',scene:'韓国語の交流会に来ました。初めて会う相手に、自分のことを伝えて会話を続けましょう。',goals:['立場と出身を伝える','住んでいる場所や好きなものを話す','次に会える日を伝える'],words:[[['저','私'],['학생','学生']],[['일본','日本'],['사람','人']],[['한국어','韓国語'],['공부해요','勉強します']],[['도쿄','東京'],['살아요','住んでいます']],[['커피','コーヒー'],['좋아해요','好きです']],[['내일','明日'],['시간','時間'],['있어요','あります']]]},
 '4-1':{image:'assets/cafe-dusk-v2.jpg',title:'カフェで注文する',scene:'カフェで冷たいアメリカーノを注文します。サイズや支払いについて聞かれても、希望を伝えましょう。',goals:['飲み物とサイズを選ぶ','店内で飲むことを伝える','カードで払い、レシートを受け取る'],words:[[['아메리카노','アメリカーノ'],['한 잔','一杯'],['주세요','ください']],[['차가운','冷たい'],['걸로','ものに']],[['작은','小さい']],[['여기서','ここで'],['마실게요','飲みます']],[['카드','カード'],['할게요','〜にします']],[['영수증','レシート'],['주세요','ください']]]},
 '5-1':{title:'変更された予定を確認する',scene:'図書館の営業時間や待ち合わせ場所を確認します。案内とメッセージから、次に何をするか決めましょう。',goals:['曜日と時間を確認する','変更された場所を見つける','書き手の選ぶ理由を理解する'],words:[[['평일','平日'],['토요일','土曜日'],['닫고','閉まり']],[['비','雨'],['역 앞','駅の前'],['그대로','そのまま']],[['자전거','自転車'],['운동','運動'],['버스','バス']]]},
 '6-1':{title:'提案の理由を確かめる',scene:'仕事や地域の話し合いで、提案を検討しています。条件と理由を確かめ、書き手の意図に合う判断を選びましょう。',goals:['条件に合う行動を選ぶ','提案の理由を説明する','数字だけで結論を出さない'],words:[[['선착순','先着順'],['대기자','キャンセル待ちの人'],['신청','申し込み']],[['자료','資料'],['결론','結論'],['논의','議論']],[['민원','苦情・要望'],['만족도','満足度'],['절차','手続き']]]}
};
koreanCases['7-1']={title:'전문 논설 읽기',scene:'평가 제도, 주민과의 대화, 지역 정책에 관한 논설을 읽어요. 주장이 어떤 전제에 기대고 있는지, 근거가 충분한지 살펴보세요.',goals:['주장과 반론 구분하기','반어적 표현과 숨은 전제 파악하기','인과관계의 근거 따져 보기'],words:[[['지표','指標'],['기여','貢献'],['무능','無能']],[['변경 사항','変更事項'],['반영','反映'],['의지','意志']],[['매출','売上'],['효과','効果'],['비교','比較']]]};
const passageScenes={
 '7-1':[
  ['평가 지표의 한계 살펴보기','평가 제도에 관한 논설을 읽어요. 숫자로 드러나는 성과와 드러나기 어려운 기여를 어떻게 평가해야 할지 생각해 보세요.'],
  ['설명회 발언의 속뜻 읽기','주민 설명회를 비판하는 글을 읽어요. 칭찬처럼 들리는 말에 어떤 의도가 담겼는지, 참석자가 무엇을 문제 삼는지 살펴보세요.'],
  ['정책의 효과 검증하기','지역 서점 지원에 관한 논설을 읽어요. 매출 증가가 정책 덕분이라고 판단하려면 어떤 증거가 더 필요한지 살펴보세요.']
 ],
 '5-1':[
  ['土曜日に図書館へ行く','土曜日に図書館で勉強したいと思っています。閉まる時間を確認して、予定を立てましょう。'],
  ['待ち合わせ場所が変わった','雨の日、友達からメッセージが届きました。どこへ向かえばよいか確かめましょう。'],
  ['近くへ出かける方法を考える','友達が自転車を勧めています。どんな理由で選んでいるのか読んでみましょう。']
 ],
 '6-1':[
  ['講座に申し込む','講座の案内が届きました。優先受付の条件を読み、自分が申し込める日を確かめましょう。'],
  ['会議の準備をする','会議の前に、どこまで決めておくか意見が分かれています。提案の理由を確かめましょう。'],
  ['苦情が減った理由を考える','新しい制度で苦情が減りました。この数字だけで満足度が上がったと判断できるか考えましょう。']
 ]
};
export const caseText=text=>phraseText(text,text.match(/[^。！？]+[。！？]?/g)||[text]);
export function koreanCaseImage(id,index){const c=koreanCases[id];if(id==='3-4'&&index!==undefined){if(index===2)return `<div class="korean-scene-image korean-bag-image">${bag('red')}</div>`;return `<img class="korean-scene-image korean-object-image" src="${['assets/word-blue-bag-v1.png','assets/word-near-window-v1.png'][index]}" alt="${esc(c.title)}" width="1536" height="1024">`;}return c?.image?`<img class="korean-scene-image" src="${esc(c.image)}" alt="${esc(c.title)}" width="960" height="640" decoding="async">`:'';}
export function renderKoreanCase(s,top){const id=s.korean.active,c={...koreanCases[id]},scene=passageScenes[id]?.[s.korean.lessons[id].index];if(scene){[c.title,c.scene]=scene;c.goals=[];}return `${top(c.title)}<main class="page korean-page case-intro${id==='4-1'?' case-lesson':''}" lang="${id==='7-1'?'ko':'ja'}">${koreanCaseImage(id)}<div class="audio-text-row"><h1>${esc(c.title)}</h1>${/^3-|^4-/.test(id)?button(icon('sound'),'korean-intro-audio','icon-button','aria-label="もう一度聞く"'):''}</div><p>${caseText(c.scene)}</p><ul>${c.goals.map(x=>`<li>${caseText(x)}</li>`).join('')}</ul>${button(id==='7-1'?'본문 읽기':'必要な文を学ぶ','korean-next')}</main>`;}
export function koreanCaseWords(id,index,text){const words=(koreanCases[id]?.words[index]||[]).filter(([word])=>text.includes(word));return words.length?`<section class="case-words"><h2>${id==='7-1'?'문장 속 단어':'文の中の単語'}</h2><dl>${words.map(([word,meaning])=>`<div><dt lang="ko">${esc(word)}</dt><dd lang="ja">${esc(meaning)}</dd></div>`).join('')}</dl></section>`:'';}

export const koreanCaseQuestions={
 '3-1':['交流会で、学生であることを伝えましょう。','日本から来たことを相手に伝えましょう。','何を勉強しているか聞かれました。韓国語を学んでいると答えましょう。','住んでいる場所を聞かれました。東京に住んでいると伝えましょう。','好きな飲み物を聞かれました。コーヒーが好きだと答えましょう。','明日の誘いを受けました。空いていると伝えましょう。'],
 '4-1':['アメリカーノを一杯注文しましょう。','冷たい飲み物が欲しいと伝えましょう。','小さいサイズを選びましょう。','店内で飲むと伝えましょう。','カードで支払うと伝えましょう。','レシートを頼みましょう。']
};

for(const [id,lesson] of Object.entries(extraKoreanCases)){koreanCases[id]={...lesson,words:lesson.items.map(item=>item.words)};koreanCaseQuestions[id]=lesson.items.map(item=>item.question);}
