import {createReviewCorrectFeedback} from './review-correct-feedback.js';
import {renderTokenBuilder,renderTokenSelection} from './token-builder.js';
import {esc,icon,quotedText} from './ui.js';
import {dialogueText as sentence} from './scenario-dialogue-text.js';

const copy={ko:{title:'혼자 대화하기',history:'앞 대화 보기',self:'나',answer:'내 답',listen:'다시 듣기',weather:'날씨 안내를 들어 보세요.',show:'문장 보기',send:'보내기',next:'다음',finish:'학습 마치기',correct:'맞아요.',retry:'다시 생각해 보세요.',error:'소리를 재생하지 못했어요. 다시 눌러 주세요.',fallback:'소리가 나오지 않으면 문장 보기를 눌러 주세요.'},ja:{title:'自分で会話する',history:'これまでの会話',self:'自分',answer:'自分の答え',listen:'もう一度聞く',weather:'天気の案内を聞きましょう。',show:'文を見る',send:'送る',next:'次へ',finish:'学習を終える',correct:'正解です。',retry:'もう一度考えてみましょう。',error:'音を再生できませんでした。もう一度押してください。',fallback:'音が出ない場合は「文を見る」を押してください。'}};
const labels=s=>({c:copy[s.courseDirection==='ja-ko'?'ja':'ko'],ui:s.courseDirection==='ja-ko'?'ja':'ko',lang:s.courseDirection==='ja-ko'?'ko':'ja'});

export function renderScenarioRehearsal(s,t,p,top){
 const {c,ui,lang}=labels(s),x=t.item,scene=t.sceneContent,partner=scene.partner||(ui==='ko'?(scene.weather?'친구':'직원'):(scene.weather?'友達':'スタッフ'));
 const speaker=part=>`<button type="button" class="icon-button" data-rehearsal-audio="${part}" aria-label="${c.listen}">${icon('sound')}</button>`;
 const bubble=(item,part,audio,meaning=false)=>{const self=part==='answer',line=self?item.answer:part==='reply'?item.reply:item.text,parts=self?item.answerParts:part==='reply'?item.replyParts:item.phrases,translation=self?item.answerMeaning:part==='reply'?item.replyMeaning:item.meaning;
  return `<article class="dialogue-bubble ${self?'dialogue-self':''}"><small>${esc(self?c.self:partner)}</small><div class="audio-text-row"><p lang="${lang}"${audio==='prompt'?' data-rehearsal-prompt':''}>${sentence(line,parts,lang)}</p>${speaker(audio)}</div>${meaning?`<p class="dialogue-meaning" lang="${ui}">${quotedText(translation)}</p>`:''}</article>`;
 };
 const history=t.previous.length?`<details class="rehearsal-history" data-rehearsal-history><summary>${c.history}</summary>${t.previous.map(turn=>bubble(turn.item,'prompt',`${turn.index}:prompt`,true)+bubble(turn.item,'answer',`${turn.index}:answer`,true)+(turn.item.reply?bubble(turn.item,'reply',`${turn.index}:reply`,true):'')).join('')}</details>`:'';
 const prompt=scene.weather?`<article class="dialogue-bubble"><div class="audio-text-row"><p>${esc(partner)}</p>${speaker('prompt')}</div><details data-rehearsal-transcript><summary>${c.show}</summary><p data-rehearsal-prompt lang="${lang}">${sentence(x.text,x.phrases,lang)}</p></details></article>`:bubble(x,'prompt','prompt');
 return `${top(c.title)}<main class="page practice-page scenario-rehearsal" lang="${ui}"><h1>${quotedText(scene.weather?c.weather:x.prompt)}</h1>${scene.weather?`<p class="rehearsal-context">${quotedText(x.context)}</p>`:''}${history}${prompt}<section class="rehearsal-compose"><small>${c.self}</small>${renderTokenBuilder({tokens:t.tokens,order:t.tokenOrder,lang,answerAttributes:`data-review-answer aria-label="${c.answer}"`,choiceAttributes:i=>`data-review-token="${i}"`})}</section><section class="review-result" hidden>${bubble(x,'answer','answer',true)}${x.reply?bubble(x,'reply','reply',true):''}<p class="rehearsal-explanation">${quotedText(x.hint)}</p><p class="review-audio-error" role="status" hidden></p></section><p class="practice-feedback lesson-verdict" role="status" aria-live="polite"></p><button type="button" class="primary" data-review-confirm disabled>${c.send}</button></main>`;
}

export function mountScenarioRehearsal(root,s,t,p,{play,stop,advance,onAnswer=()=>{}}){
 const {c,lang}=labels(s),confirm=root.querySelector('[data-review-confirm]'),feedback=root.querySelector('.practice-feedback'),result=root.querySelector('.review-result'),compose=root.querySelector('.rehearsal-compose'),transcript=root.querySelector('[data-rehearsal-transcript]');
 const correctFeedback=createReviewCorrectFeedback(root,s.settings);
 let tokens=[],checked=false,alive=true,advancing=false,heard=!t.sceneContent.weather,request=0;
 const sync=()=>{confirm.disabled=advancing||!checked&&(!heard||tokens.length!==t.answerLength);root.querySelector('[data-review-answer]').innerHTML=renderTokenSelection({tokens:t.tokens,selected:tokens,locked:checked,lang,selectedAttributes:i=>`data-review-remove="${i}"`});for(const b of root.querySelectorAll('[data-review-token]'))b.disabled=checked||tokens.length===t.answerLength||tokens.includes(Number(b.dataset.reviewToken));};
 const status=message=>{const target=checked?result.querySelector('.review-audio-error'):feedback;target.textContent=message;if(checked)target.hidden=!message;};
 const audioEntry=part=>{const match=/^([0-2]):(prompt|answer|reply)$/.exec(part);if(match)return t.previous.find(turn=>turn.index===Number(match[1]))?.[`${match[2]}Audio`];return part==='prompt'||checked?({prompt:t.promptAudio,answer:t.answerAudio,reply:t.replyAudio})[part]:null;};
 const audio=async part=>{const entry=audioEntry(part);if(!entry)return;const n=++request;correctFeedback.stopSound();stop();let failed=false;try{await play(entry,()=>{failed=true;});if(!alive||n!==request)return;if(failed)status(t.sceneContent.weather&&!checked?c.fallback:c.error);else{if(part==='prompt')heard=true;status('');}sync();}catch{if(alive&&n===request){status(t.sceneContent.weather&&!checked?c.fallback:c.error);sync();}}};
 const click=async event=>{const b=event.target.closest('button');if(!b||b.disabled||!alive||advancing)return;
  if(b.hasAttribute('data-rehearsal-audio')){void audio(b.dataset.rehearsalAudio);return;}
  if(checked){if(b.hasAttribute('data-review-confirm')){advancing=true;sync();await advance();}return;}
  if(b.hasAttribute('data-review-token')){tokens.push(Number(b.dataset.reviewToken));feedback.textContent='';sync();}
  if(b.hasAttribute('data-review-remove')){const id=Number(b.dataset.reviewRemove);tokens=tokens.filter(token=>token!==id);feedback.textContent='';sync();root.querySelector(`[data-review-token="${id}"]`)?.focus({preventScroll:true});}
  if(b.hasAttribute('data-review-confirm')){request++;stop();const correct=tokens.length===t.answerLength&&(t.acceptedOrders||[Array.from({length:t.answerLength},(_,i)=>i)]).some(order=>tokens.every((id,i)=>id===order[i]));onAnswer(correct);feedback.classList.toggle('success',correct);feedback.textContent=correct?c.correct:c.retry;
   if(correct){checked=true;compose.hidden=true;result.hidden=false;confirm.textContent=p.index===p.count-1?c.finish:c.next;correctFeedback.play();confirm.scrollIntoView({block:'nearest'});}else feedback.scrollIntoView({block:'nearest'});sync();
  }
 };
 const reveal=()=>{if(transcript.open){heard=true;sync();}};
 stop();root.addEventListener('click',click);transcript?.addEventListener('toggle',reveal);sync();
 return()=>{alive=false;request++;correctFeedback.dispose();stop();root.removeEventListener('click',click);transcript?.removeEventListener('toggle',reveal);};
}
