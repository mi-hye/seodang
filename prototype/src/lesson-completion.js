import {icon} from './ui.js';
import {japaneseLessonUI} from './curriculum.js';
import {playReviewCompletionSound} from './review-correct-feedback.js';

export function renderLessonComplete(s,top,hasNext){
 const jp=japaneseLessonUI(s),title=jp?'学習が完了しました':'학습을 완료하셨습니다';
 const next=`<button type="button" class="primary" data-action="completed-next">${hasNext?(jp?'次のレッスン':'다음 수업'):(jp?'学習ホームへ':'학습 홈으로')}</button>`;
 const actions=hasNext?`<div class="button-pair"><button type="button" class="secondary" data-action="home">${jp?'ホームへ':'홈으로'}</button>${next}</div>`:next;
 const sparks=Array.from({length:24},(_,i)=>`<i style="--angle:${i*15}deg;--delay:${i%3*80}ms;--distance:${70+i%4*15}px"></i>`).join('');
 return `${top(jp?'学習完了':'학습 완료')}<div class="lesson-progress" role="progressbar" aria-label="${jp?'学習の進み具合':'학습 진행률'}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><span style="width:100%"></span></div><main class="page practice-complete"><div class="practice-fireworks" aria-hidden="true">${sparks}<span>${icon('paw')}</span></div><h1 tabindex="-1">${title}</h1>${actions}</main>`;
}

// Only committed state transitions can arm the cue. Mounting saved completion
// screens or re-rendering them never creates a new completion event.
export function createLessonCompletion({playSound=playReviewCompletionSound}={}){
 let pending=null,active=null,disposeSound;
 const stop=()=>{disposeSound?.();disposeSound=null;};
 const cancel=()=>{pending=null;active=null;stop();};
 function transition(before,after){
  if(before&&after&&before.lesson_id===after.lesson_id&&!before.done&&after.done)pending=after.lesson_id;
  else if(pending&&(after?.lesson_id!==pending||!after.done))pending=null;
 }
 function mount(root,snapshot,settings,onComplete=()=>{}){
  const screen=root.querySelector('main.practice-complete');
  if(!screen||!snapshot?.done){cancel();return;}
  root.querySelector('.shell')?.classList.add('lesson-complete-shell');
  if(active&&active!==snapshot.lesson_id)stop();
  active=snapshot.lesson_id;
  if(settings?.sound===false)stop();
  if(pending!==active)return;
  pending=null;
  onComplete();
  screen.querySelector('h1')?.focus({preventScroll:true});
  stop();
  if(!root.ownerDocument?.hidden)disposeSound=playSound(settings);
 }
 return {transition,mount,cancel};
}
