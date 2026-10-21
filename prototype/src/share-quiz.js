import {quizSets,quizRoute,quizShareText,publicQuizURL,quizInvitationURL} from './share-quiz-content.js';
const {direction,quiz:first}=quizRoute(location.search),jp=direction==='ja-ko',text=(ko,ja)=>jp?ja:ko,root=document.querySelector('#quiz');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let quiz=first,chosen=null,checked=false;
const publicPage=Boolean(publicQuizURL(location.href,direction,first.id));
const iosStore='https://apps.apple.com/app/id6780309771',androidStore='https://play.google.com/store/apps/details?id=com.mihye.seodang';
const learnLink=publicPage?`<div class="button-pair store-links"><a href="${iosStore}">iPhone</a><a href="${androidStore}">Android</a></div>`:`<a class="learn" href="playable.html">${text('서당에서 더 배워보기','ソダンでもっと学ぶ')} →</a>`;
document.documentElement.lang=jp?'ja':'ko';document.title=text('30초 표현 퀴즈 · 서당','30秒表現クイズ · ソダン');
function render(){
 root.innerHTML=`<header><a href="${publicPage?iosStore:'playable.html'}">${text('서당','ソダン')}</a><span>${text('가입 없이 · 약 30초','登録なし · 約30秒')}</span></header><p class="eyebrow">${text('이 말, 어떻게 들려?','この言葉、どう聞こえる？')}</p><h1>${escape(quiz.question)}</h1><p>${escape(quiz.situation)}</p><blockquote lang="${jp?'ko':'ja'}">${escape(quiz.line)}</blockquote><div class="choices" role="group" aria-label="${text('답 고르기','答えを選ぶ')}">${quiz.options.map((x,i)=>`<button class="choice ${checked&&i===quiz.answer?'correct':''}" data-answer="${i}" aria-pressed="${chosen===i}" ${checked?'disabled':''}>${escape(x)}</button>`).join('')}</div>${checked?`<section class="feedback" role="status"><h2>${chosen===quiz.answer?text('맞아요!','そのとおり！'):text('이렇게도 읽을 수 있어요','こんな受け取り方ができます')}</h2><p>${escape(quiz.explanation)}</p></section><div class="button-pair"><button data-next>${text('다른 문제','別の問題')}</button><button class="primary" data-share>${text('친구에게 보내기','友達に送る')}</button></div>${learnLink}`:`<button class="primary check" data-check ${chosen===null?'disabled':''}>${text('해설 보기','解説を見る')}</button>`}<p class="share-status" role="status"></p><div data-copy hidden><label>${text('복사해서 친구에게 보내세요.','コピーして友達に送ってください。')}<textarea readonly rows="8"></textarea></label></div><footer>${text('서당이 만든 학습용 대화예요.','ソダンが作成した学習用の会話です。')}</footer>`;
}
root.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.answer!==undefined){chosen=Number(b.dataset.answer);render();root.querySelector(`[data-answer="${chosen}"]`).focus();}
 if(b.hasAttribute('data-check')){checked=true;render();root.querySelector('.feedback').scrollIntoView({block:'nearest'});}
 if(b.hasAttribute('data-next')){const items=quizSets[direction];quiz=items[(items.indexOf(quiz)+1)%items.length];chosen=null;checked=false;render();window.scrollTo(0,0);}
 if(b.hasAttribute('data-share')){
  const url=quizInvitationURL(location.href,direction,quiz.id),body=quizShareText(direction,quiz),copy=url?`${body}\n\n${url}`:body;
  b.disabled=true;
  try{if(navigator.share){await navigator.share({title:text('서당 표현 퀴즈','ソダン表現クイズ'),text:body,...(url?{url}:{})});return;}if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(copy);root.querySelector('.share-status').textContent=text('복사했어요. 친구에게 보내 보세요.','コピーしました。友達に送ってみましょう。');return;}throw Error('copy unavailable');}
  catch(error){if(error.name!=='AbortError'){const box=root.querySelector('[data-copy]');box.hidden=false;const area=box.querySelector('textarea');area.value=copy;area.focus();area.select();}}
  finally{if(b.isConnected)b.disabled=false;}
 }
});
render();
