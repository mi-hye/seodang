import {createReviewCorrectFeedback} from './review-correct-feedback.js';
import {button,esc,icon,phraseText,quotedText} from './ui.js';
import {renderTokenBuilder,renderTokenSelection} from './token-builder.js';
const copy={ko:{word:'단어 맞추기',title:'배운 표현 복습',stages:['듣고 뜻 찾기','문장 만들기','상황에서 쓰기'],listen:'다시 듣기',show:'문장 보기',check:'확인',next:'다음',finish:'학습 마치기',undo:'하나 지우기',empty:'말을 순서대로 골라요.',correct:'맞아요.',retry:'다시 생각해 보세요.',audioError:'소리를 재생하지 못했어요. 다시 눌러 주세요.',error:'소리가 나오지 않으면 문장 보기를 눌러 주세요.'},ja:{word:'単語を選ぶ',title:'習った表現の復習',stages:['聞いて意味を選ぶ','文を作る','場面で使う'],listen:'もう一度聞く',show:'文を見る',check:'確認',next:'次へ',finish:'学習を終える',undo:'一つ戻す',empty:'言葉を順番に選びましょう。',correct:'正解です。',retry:'もう一度考えてみましょう。',audioError:'音を再生できませんでした。もう一度押してください。',error:'音が出ない場合は「文を見る」を押してください。'}};
const data=s=>({c:copy[s.courseDirection==='ja-ko'?'ja':'ko'],ui:s.courseDirection==='ja-ko'?'ja':'ko',lang:s.courseDirection==='ja-ko'?'ko':'ja'});
const sentence=(value,lang)=>lang==='ko'?esc(value):phraseText(value);
export function renderIntroductionReview(s,t,p,top){
 const {c,ui,lang}=data(s),order=t.type==='order',listen=t.type==='listen';

 const speaker=()=>`<button type="button" class="icon-button" data-review-audio aria-label="${c.listen}">${icon('sound')}</button>`;
 return `${top(c.title)}<main class="page practice-page introduction-review" lang="${ui}"><div class="review-head"><h1>${t.type==='word'?c.word:c.stages[t.stage]}</h1></div>${listen?`<div class="audio-text-row review-listen"><p>${esc(t.prompt)}</p>${speaker()}</div><details data-review-transcript><summary>${c.show}</summary><p lang="${lang}">${sentence(t.unit.text,lang)}</p></details>`:t.type==='word'?`<div class="audio-text-row review-word-prompt"><h2 class="review-build-meaning" lang="${lang}">${sentence(t.unit.text,lang)}</h2>${speaker()}</div>`:order?`<h2 class="review-build-meaning" id="review-build-meaning">${quotedText(t.scene)}</h2>`:`<p class="case-task-scene">${quotedText(t.scene)}</p>${t.prompt?`<h2>${quotedText(t.prompt).replaceAll('\n','<br>')}</h2>`:''}`}${order?renderTokenBuilder({tokens:t.tokens,order:t.tokenOrder||t.tokens.map((_,i)=>i).reverse(),lang,empty:c.empty,answerAttributes:'data-review-answer aria-labelledby="review-build-meaning"',choiceAttributes:i=>`data-review-token="${i}"`}):`<div class="case-task-options${t.type==='word'?' review-word-grid':''}">${t.options.map((option,i)=>`<button type="button" class="secondary" data-review-choice="${i}" aria-pressed="false" ${t.type==='word'?`aria-label="${esc(t.optionLabels[i])}"`: ''} lang="${listen||t.type==='word'?ui:lang}">${t.type==='word'?`<img src="${esc(t.optionPictures[i])}" alt="" width="160" height="120" draggable="false">`:listen?quotedText(option):sentence(option,lang)}</button>`).join('')}</div>`}<p class="practice-feedback lesson-verdict" role="status" aria-live="polite"></p><section class="review-result" hidden><div class="audio-text-row"><p lang="${lang}">${sentence(t.unit.text,lang)}</p>${speaker()}</div><p lang="${ui}">${quotedText(t.unit.meaning)}</p><p class="review-audio-error" role="status" hidden></p></section>${order?`<div class="button-pair">${button(c.undo,'review-undo','secondary','data-review-undo disabled')}${button(c.check,'review-confirm','primary','data-review-confirm disabled')}</div>`:button(c.check,'review-confirm','primary','data-review-confirm disabled')}</main>`;
}
export function mountIntroductionReview(root,s,t,p,{play,stop,advance,onAnswer=()=>{}}){
 const {c,lang}=data(s),confirm=root.querySelector('[data-review-confirm]'),feedback=root.querySelector('.practice-feedback'),undo=root.querySelector('[data-review-undo]'),result=root.querySelector('.review-result');
 const correctFeedback=createReviewCorrectFeedback(root,s.settings);
 let selected=null,tokens=[],checked=false,alive=true,advancing=false,heard=t.type!=='listen',request=0;
 const sync=()=>{confirm.disabled=advancing||!checked&&(!heard||(t.type==='order'?tokens.length!==(t.answerLength??t.tokens.length):selected===null));if(undo)undo.disabled=checked||!tokens.length;if(t.type==='order'){root.querySelector('[data-review-answer]').innerHTML=renderTokenSelection({tokens:t.tokens,selected:tokens,locked:checked,lang,empty:c.empty,selectedAttributes:i=>`data-review-remove="${i}"`});for(const b of root.querySelectorAll('[data-review-token]'))b.disabled=checked||tokens.length===(t.answerLength??t.tokens.length)||tokens.includes(Number(b.dataset.reviewToken));}};
 const audioStatus=message=>{if(checked){const error=result.querySelector('.review-audio-error');error.textContent=message===c.correct?'':message;error.hidden=!error.textContent;}else feedback.textContent=message;};
 const audio=async entry=>{if(!entry||!alive)return;const n=++request;correctFeedback.stopSound();stop();let failed=false;try{await play(entry,()=>{failed=true;});if(!alive||n!==request)return;if(failed){audioStatus(t.type==='listen'?c.error:c.audioError);}else{if(t.type==='listen')heard=true;audioStatus(checked?c.correct:'');}sync();}catch{if(alive&&n===request){audioStatus(t.type==='listen'?c.error:c.audioError);sync();}}};
 const showFeedback=(correct,message)=>{feedback.classList.toggle('success',correct);feedback.innerHTML=`<span data-review-feedback-text>${quotedText(message)}</span>`;if(!correct)feedback.scrollIntoView({block:'nearest'});};
 const click=async e=>{const b=e.target.closest('button');if(!b||b.disabled||!alive||advancing)return;
  if(b.hasAttribute('data-review-audio')){void audio(t.unit.audio);return;}
  if(checked){if(b.hasAttribute('data-review-confirm')){advancing=true;sync();await advance();}return;}
  if(b.hasAttribute('data-review-token')){tokens.push(Number(b.dataset.reviewToken));feedback.textContent='';sync();}
  if(b.hasAttribute('data-review-remove')){const id=Number(b.dataset.reviewRemove);tokens=tokens.filter(token=>token!==id);feedback.textContent='';sync();root.querySelector(`[data-review-token="${id}"]`)?.focus({preventScroll:true});}
  if(b.hasAttribute('data-review-undo')){tokens.pop();feedback.textContent='';sync();}
  if(b.hasAttribute('data-review-choice')){selected=Number(b.dataset.reviewChoice);for(const x of root.querySelectorAll('[data-review-choice]'))x.setAttribute('aria-pressed',String(x===b));feedback.textContent='';sync();if(t.optionAudio?.[selected])void audio(t.optionAudio[selected]);}
  if(b.hasAttribute('data-review-confirm')){
   request++;stop();
   const correct=t.type==='order'?tokens.every((id,i)=>id===i):selected===t.answer;onAnswer(correct);
   const reason=t.type==='order'?t.orderFeedback:t.wrongFeedback?.[t.options[selected]];
   showFeedback(correct,correct?c.correct:reason||c.retry);
   if(correct){checked=true;result.hidden=false;confirm.textContent=p.index===p.count-1?c.finish:c.next;for(const x of root.querySelectorAll('[data-review-choice]'))x.disabled=true;result.scrollIntoView({block:'nearest'});correctFeedback.play();}sync();
  }
 };
 const transcript=root.querySelector('[data-review-transcript]');const reveal=()=>{if(transcript.open){heard=true;sync();}};
 stop();root.addEventListener('click',click);transcript?.addEventListener('toggle',reveal);sync();
 // Listening starts only on the explicit listen button, so it also works with sound disabled.
 return()=>{alive=false;request++;correctFeedback.dispose();stop();root.removeEventListener('click',click);transcript?.removeEventListener('toggle',reveal);};
}
