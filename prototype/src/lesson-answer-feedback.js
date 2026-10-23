import {createReviewCorrectFeedback} from './review-correct-feedback.js';
import {dialogueProgress,reduceDialogue} from './dialogue-state.js';
import {readingProgress,reduceReading} from './reading-state.js';
import {koreanProgress,reduceKorean} from './korean-state.js';
import {courseGroup,japaneseLessonUI} from './curriculum.js';

// Inspect the existing reducer's result; keep grading and saved progress unchanged.
export function isAdvancingCorrectAnswer(s,kind,action,id){
 if(courseGroup(s.onboardingLevel)<4||action!==`${kind}-check`||s.practices?.[`${s.courseDirection}:${kind}:${kind==='dialogue'?0:kind==='reading'?s.onboardingLevel:s.korean?.active}`])return false;
 let before,after;
 if(kind==='dialogue'){before=dialogueProgress(s);after=reduceDialogue(before,{type:action,id});}
 else if(kind==='reading'){before=readingProgress(s,s.onboardingLevel);after=reduceReading(before,{type:action,id},s.onboardingLevel);}
 else if(kind==='korean'){before=koreanProgress(s,s.korean.active);after=reduceKorean(s,{type:action,id}).lessons[s.korean.active];}
 return Boolean(before&&after&&before.selected!==null&&(before.index!==after.index||before.phase!==after.phase));
}

function verdict(root,s,selector){
 let node=root.querySelector(selector);
 if(!node){
  node=root.ownerDocument.createElement('p');
  node.className='lesson-answer-feedback';node.setAttribute('role','status');
  const actions=root.querySelector('main > .button-pair');
  if(actions)actions.before(node);else root.querySelector('main')?.append(node);
 }
 node.hidden=false;node.classList.add('lesson-verdict','success');
 if(!node.textContent.trim())node.textContent=japaneseLessonUI(s)?'正解です。':'맞아요.';
 return node;
}

export function mountLessonCorrect(root,s,selector,{play=true}={}){
 const node=verdict(root,s,selector);node.dataset.lessonCorrect='';
 const cue=createReviewCorrectFeedback(root,s.settings,'[data-lesson-correct]');if(play)cue.play();else cue.restore();
 const dispose=()=>cue.dispose();dispose.stopSound=cue.stopSound;return dispose;
}

// Match expression reviews: show the answer once, then advance on the same button.
// This temporary acknowledgement is not a new saved lesson phase. Leaving the
// screen before Next keeps the existing question, as other review screens do.
export function mountAdvancingCorrectAnswer(root,s,action,advance,{play=true}={}){
 const kind=action.split('-')[0],confirm=root.querySelector(`[data-action="${action}"]`);
 const node=verdict(root,s,'.lesson-verdict,.dialogue-feedback,.korean-feedback');
 node.textContent=japaneseLessonUI(s)?'正解です。':'맞아요.';
 for(const choice of root.querySelectorAll(`[data-action="${kind}-select"]`)){
  choice.disabled=true;if(choice.getAttribute('aria-pressed')==='true')choice.classList.add('correct');
 }
 confirm.textContent=japaneseLessonUI(s)?'次へ':'다음';
 const disposeCue=mountLessonCorrect(root,s,'.lesson-verdict',{play});let alive=true,continued=false;
 const click=event=>{
  if(!alive||continued||event.target.closest('button')!==confirm)return;
  event.preventDefault();event.stopImmediatePropagation();continued=true;advance();
 };
 root.addEventListener('click',click,true);
 const dispose=()=>{alive=false;disposeCue();root.removeEventListener('click',click,true);};
 dispose.stopSound=disposeCue.stopSound;return dispose;
}

export function advancingQuestionKey(s,kind){
 const lesson=kind==='dialogue'?0:kind==='reading'?s.onboardingLevel:s.korean?.active;
 const p=kind==='dialogue'?dialogueProgress(s):kind==='reading'?readingProgress(s,s.onboardingLevel):kind==='korean'?koreanProgress(s,lesson):null;
 return p?JSON.stringify([s.courseDirection,kind,lesson,p.index,p.phase,p.selected]):null;
}
