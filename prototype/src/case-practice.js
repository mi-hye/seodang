import {feedbackText} from './feedback-text.js';
import {renderTokenBuilder,renderTokenSelection} from './token-builder.js';
import {japaneseLessonUI} from './curriculum.js';
import {phraseText, button} from './ui.js';
const text=value=>phraseText(value.replaceAll('|',''),value.includes('|')?value.split('|'):value.split(/(\n|(?<=[。！？])|\s+)/));
const copy={ko:{title:'사건 해결 연습',order:'문장 만들기',replace:'바꿔 말하기',reply:'대화 이어가기',evidence:'근거 찾기',apply:'새 상황 해결하기',check:'확인',next:'다음',undo:'하나 지우기',empty:'말을 순서대로 눌러주세요.',correct:'맞아요.',retry:'상황을 다시 확인해 보세요.'},ja:{title:'場面で使う練習',order:'文を作る',replace:'言い換える',reply:'会話を続ける',evidence:'根拠を探す',apply:'新しい場面を解決する',check:'確認',next:'次へ',undo:'一つ戻す',empty:'言葉を順番に押してください。',correct:'正解です。',retry:'場面をもう一度確かめましょう。'}};
const locale=s=>japaneseLessonUI(s)?'ja':'ko';
export function renderCasePractice(s,task,p,top){
 const c=copy[locale(s)],language=s.courseDirection==='ja-ko'?'ko':'ja';
 const order=task.type==='order',ids=order?task.tokens.map((_,i)=>i).reverse():[];
 return `${top(c.title)}<main class="page practice-page case-practice" lang="${locale(s)}"><div class="case-task-count">${p.index+1} / ${p.count}</div><h1>${c[task.type]}</h1><p class="case-task-scene">${text(task.scene)}</p>${task.passage?`<article class="case-task-passage" lang="${language}">${task.passage.split('\n').map(line=>`<p>${text(line)}</p>`).join('')}</article>`:''}<h2>${text(task.prompt)}</h2>${order?renderTokenBuilder({tokens:task.tokens,order:ids,lang:language,empty:c.empty,answerClass:'case-task-answer',choicesClass:'case-task-tokens',answerAttributes:'data-case-answer',choiceAttributes:i=>`data-case-token="${i}"`}):`<div class="case-task-options">${task.options.map((option,i)=>`<button type="button" class="secondary" data-case-choice="${i}" lang="${/[가-힣]/.test(option)?'ko':'ja'}" aria-pressed="false">${text(option)}</button>`).join('')}</div>`}<p class="practice-feedback" role="status"></p>${order?`<div class="button-pair">${button(c.undo,'case-undo','secondary','data-case-undo disabled')}${button(c.check,'case-confirm','primary','data-case-confirm disabled')}</div>`:button(c.check,'case-confirm','primary','data-case-confirm disabled')}</main>`;
}
export function mountCasePractice(root,s,task,{advance,stop,onAnswer=()=>{}}){
 const c=copy[locale(s)],confirm=root.querySelector('[data-case-confirm]'),feedback=root.querySelector('.practice-feedback'),undo=root.querySelector('[data-case-undo]');let selected=null,tokens=[],checked=false,busy=false,alive=true;
 const update=()=>{confirm.disabled=busy||(task.type==='order'?tokens.length!==task.tokens.length:selected===null);if(undo)undo.disabled=checked||tokens.length===0;if(task.type==='order'){root.querySelector('[data-case-answer]').innerHTML=renderTokenSelection({tokens:task.tokens,selected:tokens,locked:checked,lang:s.courseDirection==='ja-ko'?'ko':'ja',empty:c.empty});for(const b of root.querySelectorAll('[data-case-token]'))b.disabled=checked||tokens.includes(Number(b.dataset.caseToken));}};
 const handle=async e=>{
  const b=e.target.closest('button');if(!alive||!b||b.disabled||busy)return;
  if(b.hasAttribute('data-case-token')&&!checked){tokens.push(Number(b.dataset.caseToken));feedback.textContent='';update();}
  if(b.hasAttribute('data-case-undo')&&!checked){tokens.pop();feedback.textContent='';update();}
  if(b.hasAttribute('data-case-choice')&&!checked){selected=Number(b.dataset.caseChoice);for(const x of root.querySelectorAll('[data-case-choice]'))x.setAttribute('aria-pressed',String(x===b));feedback.textContent='';update();}
  if(b.hasAttribute('data-case-confirm')){
   if(checked){busy=true;update();await advance();return;}
   const correct=task.type==='order'?tokens.every((id,i)=>id===i):selected===task.answer;
   onAnswer(correct);
   const reason=task.type==='order'?task.orderFeedback:task.wrongFeedback?.[task.options[selected]];
   feedback.innerHTML=feedbackText(correct?`${c.correct} ${task.hint}`:(reason||`${c.retry} ${task.hint}`));
   if(correct){checked=true;confirm.textContent=c.next;for(const x of root.querySelectorAll('[data-case-choice]'))x.disabled=true;}update();
  }
 };
 stop();root.addEventListener('click',handle);update();return()=>{alive=false;root.removeEventListener('click',handle);};
}
