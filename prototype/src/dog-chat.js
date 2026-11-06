import {esc,icon,phraseText,quotedText} from './ui.js';
import {showSheet,closeSheet} from './sheet.js';
import {dogChatLessons} from './dog-chat-lessons.js';
import {dogChatConfig} from './dog-chat-config.js';
import {createDogChatAPI} from './dog-chat-api.js';

let styles,active;
function loadStyles(){
 styles ||= new Promise((resolve,reject)=>{
  const link=document.createElement('link');link.rel='stylesheet';link.href='src/dog-chat.css';
  link.onload=resolve;link.onerror=()=>{link.remove();styles=null;reject(Error('Practice styles unavailable'));};document.head.append(link);
 });return styles;
}
const copy={
 ko:{title:'배운 표현 써보기',intro:'서당개에게 자기소개해 봐요',description:'배운 표현으로 세 번 대답해요. 마지막에 AI가 잘 쓴 표현을 살펴보고 필요한 부분만 짚어줘요.',privacy:'답변 세 개와 이 수업의 내용이 OpenAI에 전송돼요. 이름이나 연락처 같은 개인정보는 쓰지 마세요. AI의 설명은 틀릴 수 있어요.',consent:'AI 피드백을 위해 답변을 보내는 데 동의해요.',limit:'하루 세 번까지 연습할 수 있어요.',start:'시작하기',close:'닫기',return:'완료 화면으로',preparing:'대화를 준비하고 있어요',notReady:'지금은 연결을 준비하고 있어요. 학습은 계속할 수 있어요.',checking:'연습할 수 있는지 확인하고 있어요.',answer:'내 답변',placeholder:'배운 표현으로 답해 봐요',send:'대답하기',examples:'배운 표현',hint:'도움 보기',thinking:'세 답변을 살펴보고 있어요.',sent:'답변을 보냈어요.',done:'대화를 마쳤어요',praise:'잘 쓴 표현',correction:'이렇게 다듬어 봐요',neutral:'세 번 모두 대답했어요. 배운 표현을 다시 읽어 봐요.',notice:'AI 피드백이에요. 설명이 맞는지 배운 내용과 함께 확인해 주세요.',retry:'다시 확인',length:'답변은 160자 안으로 써 주세요.',invalid:'문자로 된 답변을 써 주세요.',errors:{daily_limit:'오늘은 세 번 모두 연습했어요. 다음에 또 이야기해요.',capacity_limit:'오늘의 AI 연습이 마감됐어요. 학습은 계속할 수 있어요.',offline:'인터넷 연결을 확인한 뒤 다시 눌러 주세요.',timeout:'답변 확인이 늦어지고 있어요. 잠시 후 다시 확인해 주세요.',in_progress:'아직 답변을 살펴보고 있어요. 잠시 후 다시 확인해 주세요.',default:'지금은 피드백을 받지 못했어요. 학습 완료 기록은 그대로예요.'}},
 ja:{title:'習った表現を使う',intro:'ソダン犬に自己紹介しよう',description:'習った表現で3回返事をします。最後にAIが、よく使えた表現と、直す必要があればその部分を伝えます。',privacy:'3つの返事とこのレッスンの内容をOpenAIに送ります。名前や連絡先などの個人情報は書かないでください。AIの説明には誤りがある場合があります。',consent:'AIのフィードバックを受けるために、返事を送ることに同意します。',limit:'1日に3回まで練習できます。',start:'始める',close:'閉じる',return:'完了画面へ',preparing:'会話を準備しています',notReady:'接続を準備しています。レッスンはそのまま続けられます。',checking:'練習できるか確認しています。',answer:'自分の返事',placeholder:'習った表現で答えてみよう',send:'返事をする',examples:'習った表現',hint:'ヒントを見る',thinking:'3つの返事を確認しています。',sent:'返事を送りました。',done:'会話が終わりました',praise:'よく使えた表現',correction:'こう直してみよう',neutral:'3回とも返事ができました。習った表現を読み返してみましょう。',notice:'AIによるフィードバックです。習った内容と合わせて確かめてください。',retry:'もう一度確認',length:'返事は160文字以内で書いてください。',invalid:'文字で返事を書いてください。',errors:{daily_limit:'今日は3回練習しました。また今度お話ししましょう。',capacity_limit:'今日のAI練習は終了しました。レッスンは続けられます。',offline:'インターネット接続を確かめて、もう一度お試しください。',timeout:'確認に時間がかかっています。少し待ってから、もう一度確認してください。',in_progress:'まだ返事を確認しています。少し待ってから、もう一度確認してください。',default:'今はフィードバックを受け取れません。学習完了の記録はそのままです。'}},
};
const phrases={
 'はじめまして。自己紹介をお願いします。':['はじめまして。','自己紹介を','お願いします。'],
 'どこに住んでいますか。':['どこに','住んでいますか。'],
 '好きな飲み物は何ですか。':['好きな','飲み物は','何ですか。'],
 '私は学生です。':['私は','学生です。'],'私は韓国人です。':['私は','韓国人','です。'],
 'ソウルに住んでいます。':['ソウルに','住んでいます。'],
 'コーヒーが好きです。':['コーヒーが','好きです。'],
 '私は日本人です。':['私は','日本人です。'],'東京に住んでいます。':['東京に','住んでいます。'],
 '会えてうれしいです。自己紹介をお願いします。':['会えて','うれしいです。','自己紹介を','お願いします。'],
 'どこに住んでいますか？':['どこに','住んでいますか？'],
 'どんな飲み物が好きですか？':['どんな飲み物が','好きですか？'],
};
const targetText=(text,lang)=>lang==='ja'?phraseText(text,phrases[text]??[text]):esc(text);
const meaningText=(text,lang)=>lang==='ja'&&phrases[text]?phraseText(text,phrases[text]):quotedText(text);
const retryable=new Set(['offline','timeout','in_progress']);
const retention={ko:['보관 안내','재전송할 때 같은 결과를 받을 수 있도록 답변 일부가 인용된 피드백을 24시간 보관해요. 이후 최대 15분 안에 삭제해요. OpenAI에 보낸 내용에는 OpenAI의 데이터 보관 정책이 적용돼요.'],ja:['保存について','再送時に同じ結果を返すため、返事の一部を引用したフィードバックを24時間保存し、その後15分以内に削除します。OpenAIへ送った内容にはOpenAIのデータ保存ポリシーが適用されます。']};

// This panel never receives the lesson reducer or writes progress/transcripts.
// Curated turns run locally; only the final, consented review reaches the API.
export async function openDogChat(lessonKey,{trigger=document.activeElement,api=createDogChatAPI()}={}){
 const lesson=dogChatLessons[lessonKey];if(!lesson)throw Error('Unsupported lesson');
 await loadStyles();if(active){active.focus();return;}
 const c=copy[lesson.nativeLanguage],dialog=document.createElement('dialog');
 dialog.className='dog-chat-panel';dialog.lang=lesson.nativeLanguage;dialog.setAttribute('aria-labelledby','dog-chat-title');
 let stage='intro',answers=[],requestId=null,busy=false,disposed=false,attempts=0,startAttempts=0,error=null,result=null,composing=false,consented=false,controller;
 const viewport=window.visualViewport;
 const resize=()=>{if(viewport){dialog.style.height=`${viewport.height}px`;dialog.style.top=`${viewport.offsetTop}px`;dialog.style.bottom='auto';}};
 const close=()=>{if(disposed)return;disposed=true;controller?.abort();viewport?.removeEventListener('resize',resize);viewport?.removeEventListener('scroll',resize);answers=[];result=null;closeSheet(dialog);dialog.remove();active=null;if(trigger?.isConnected)trigger.focus({preventScroll:true});};
 const message=()=>{
  const jp=lesson.nativeLanguage==='ja';
  if(retryable.has(error)&&(stage==='error'||attempts>=3))return jp?'接続が安定しないため、今回はここで終了します。学習完了の記録はそのままです。':'연결이 원활하지 않아 이번 연습은 여기서 마칠게요. 학습 완료 기록은 그대로예요.';
  if(stage==='error'&&!c.errors[error])return jp?'今は会話を始められません。レッスンはそのまま続けられます。':'지금은 대화를 시작할 수 없어요. 학습은 계속할 수 있어요.';
  return c.errors[error]??c.errors.default;
 };
 const heading=()=>`<header class="dog-chat-header"><h1 id="dog-chat-title">${c.title}</h1><button type="button" class="icon-button" data-dog-close aria-label="${c.close}">${icon('close')}</button></header>`;
 const dog=()=>'<img class="dog-chat-dog" src="assets/mascot/seodang-sitting-v1.png" alt="" width="80" height="80">';
 const exitButton=()=>`<button type="button" class="secondary" data-dog-close>${c.return}</button>`;
 function intro(){
  if(!dogChatConfig.enabled)return `<section class="dog-chat-intro">${dog()}<h2 tabindex="-1">${c.preparing}</h2><p>${c.notReady}</p>${exitButton()}</section>`;
  return `<section class="dog-chat-intro">${dog()}<h2 tabindex="-1">${c.intro}</h2><p>${c.description}</p><p class="dog-chat-limit">${c.limit}</p><div class="dog-chat-consent"><p id="dog-chat-privacy">${c.privacy}</p><details class="dog-chat-hint"><summary>${retention[lesson.nativeLanguage][0]}</summary><p>${retention[lesson.nativeLanguage][1]}</p></details><label><input type="checkbox" data-dog-consent aria-describedby="dog-chat-privacy"${consented?' checked':''}><span>${c.consent}</span></label></div>${error?`<p role="status" class="dog-chat-error">${message()}</p>`:''}<div class="button-pair">${exitButton()}<button type="button" class="primary" data-dog-start${consented?'':' disabled'}>${c.start}</button></div></section>`;
 }
 function transcript(){return lesson.turns.slice(0,Math.min(3,answers.length+1)).map((turn,i)=>`<div class="dog-chat-turn"${i===answers.length?' data-dog-current':''}><div class="dog-chat-prompt" tabindex="-1">${dog()}<div><p lang="${lesson.targetLanguage}">${targetText(turn.prompt,lesson.targetLanguage)}</p><small>${meaningText(turn.meaning,lesson.nativeLanguage)}</small></div></div>${answers[i]!==undefined?`<p class="dog-chat-answer" lang="${lesson.targetLanguage}">${targetText(answers[i],lesson.targetLanguage)}</p>`:''}</div>`).join('');}
 function conversation(){
  const turn=lesson.turns[answers.length];
  return `<div class="lesson-progress" role="progressbar" aria-label="${c.title}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(answers.length/3*100)}"><span style="width:${answers.length/3*100}%"></span></div><section class="dog-chat-log">${transcript()}</section>${turn?`<form class="dog-chat-compose"><h2>${c.examples}</h2><div class="dog-chat-choices${turn.choices.length===2?' button-pair':''}">${turn.choices.map((choice,i)=>`<button type="button" class="secondary" data-dog-choice="${i}"><span lang="${lesson.targetLanguage}">${targetText(choice.text,lesson.targetLanguage)}</span><small>${meaningText(choice.meaning,lesson.nativeLanguage)}</small></button>`).join('')}</div><details class="dog-chat-hint"><summary>${c.hint}</summary><p>${quotedText(turn.hint)}</p></details><label for="dog-chat-answer">${c.answer}</label><textarea id="dog-chat-answer" data-dog-answer lang="${lesson.targetLanguage}" rows="2" maxlength="320" placeholder="${c.placeholder}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="dog-chat-input-error"></textarea><p id="dog-chat-input-error" class="dog-chat-error" role="status"></p><button type="submit" class="primary" data-dog-send disabled>${c.send}</button></form>`:''}`;
 }
 function feedback(){
  const {praise,correction}=result.feedback;
  return `<section class="dog-chat-feedback">${dog()}<h2 tabindex="-1">${c.done}</h2>${praise?`<article><h3>${c.praise}</h3><p class="dog-chat-quote" lang="${lesson.targetLanguage}">${targetText(praise.quote,lesson.targetLanguage)}</p><p>${quotedText(praise.explanation)}</p></article>`:''}${correction?`<article><h3>${c.correction}</h3><p class="dog-chat-original" lang="${lesson.targetLanguage}">${targetText(correction.original,lesson.targetLanguage)}</p><p class="dog-chat-quote" lang="${lesson.targetLanguage}">${targetText(correction.suggestion,lesson.targetLanguage)}</p><p>${quotedText(correction.explanation)}</p></article>`:''}${!praise&&!correction?`<p>${c.neutral}</p>`:''}<p class="dog-chat-notice">${c.notice}</p>${exitButton()}</section>`;
 }
 function render(){
  if(disposed)return;
  const canRetry=stage==='feedback'&&retryable.has(error)&&attempts<3;
  let body=stage==='intro'?intro():stage==='turns'?conversation():stage==='done'?feedback():`<section class="dog-chat-status">${dog()}<h2 tabindex="-1">${stage==='checking'?c.checking:busy?c.thinking:message()}</h2>${busy?'<span class="dog-chat-spinner" aria-hidden="true"></span>':''}${!busy?`<div class="${canRetry?'button-pair':''}">${exitButton()}${canRetry?`<button type="button" class="primary" data-dog-retry>${c.retry}</button>`:''}</div>`:''}</section>`;
  dialog.innerHTML=`${heading()}<div class="dog-chat-body">${body}</div><span class="dog-chat-announcement" aria-live="polite" role="status"></span>`;
  if(stage==='turns'){
   dialog.querySelector('[data-dog-current]')?.scrollIntoView({block:'start'});
   dialog.querySelector('[data-dog-current] .dog-chat-prompt')?.focus({preventScroll:true});
   dialog.querySelector('.dog-chat-announcement').textContent=lesson.turns[answers.length]?.meaning??c.sent;
  }else dialog.querySelector('h2')?.focus({preventScroll:true});
 }
 async function start(){
  if(busy||stage!=='intro'||!dogChatConfig.enabled||!dialog.querySelector('[data-dog-consent]')?.checked||startAttempts>=3)return;
  startAttempts++;busy=true;stage='checking';error=null;controller=new AbortController();render();
  try{
   const available=await api.availability(lessonKey,{signal:controller.signal});if(disposed)return;
   if(!available.available||available.remaining===0){error=available.reason??'daily_limit';stage='error';}
   else{stage='turns';requestId=crypto.randomUUID();}
  }catch(e){if(disposed)return;error=e.code??'unavailable';stage=retryable.has(error)&&startAttempts<3?'intro':'error';}
  finally{busy=false;if(!disposed)render();}
 }
 async function submit(){
  if(busy||answers.length!==3||attempts>=3)return;
  attempts++;busy=true;stage='feedback';error=null;controller=new AbortController();render();
  try{
   const response=await api.submit({lessonKey,requestId,answers:[...answers],consent:true},{signal:controller.signal});if(disposed)return;
   result=response;stage='done';
  }catch(e){if(disposed)return;error=e.code??'feedback_unavailable';}
  finally{busy=false;if(!disposed)render();}
 }
 function validate(){
  const field=dialog.querySelector('[data-dog-answer]');if(!field)return false;
  const answer=field.value.trim(),tooLong=[...answer].length>160,invalid=/[<>\u0000-\u0008\u000b-\u001f\u007f]/u.test(answer);
  dialog.querySelector('[data-dog-send]').disabled=!answer||tooLong||invalid||composing||busy;
  dialog.querySelector('#dog-chat-input-error').textContent=tooLong?c.length:invalid?c.invalid:'';
  return Boolean(answer&&!tooLong&&!invalid&&!composing&&!busy);
 }
 dialog.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.hasAttribute('data-dog-close'))close();
  else if(button.hasAttribute('data-dog-start'))void start();
  else if(button.hasAttribute('data-dog-retry'))void submit();
  else if(button.hasAttribute('data-dog-choice')&&stage==='turns'){
   const choice=lesson.turns[answers.length]?.choices[Number(button.dataset.dogChoice)];if(!choice)return;
   const field=dialog.querySelector('[data-dog-answer]');field.value=choice.text;validate();field.blur();
   const send=dialog.querySelector('[data-dog-send]');send.focus({preventScroll:true});send.scrollIntoView({block:'nearest'});
  }
 });
 dialog.addEventListener('change',event=>{if(event.target.matches('[data-dog-consent]')){consented=event.target.checked;dialog.querySelector('[data-dog-start]').disabled=!consented;}});
 dialog.addEventListener('input',validate);
 dialog.addEventListener('compositionstart',()=>{composing=true;validate();});
 dialog.addEventListener('compositionend',()=>{composing=false;validate();});
 dialog.addEventListener('submit',event=>{
  event.preventDefault();if(stage!=='turns'||!validate())return;
  answers.push(dialog.querySelector('[data-dog-answer]').value.trim());
  if(answers.length===3)void submit();else render();
 });
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('close',close);
 document.body.append(dialog);active=dialog;render();resize();viewport?.addEventListener('resize',resize);viewport?.addEventListener('scroll',resize);showSheet(dialog);
 dialog.querySelector('h2')?.focus({preventScroll:true});
}
