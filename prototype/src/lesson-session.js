import {videoLesson,videoProgress} from './video-lesson-state.js';
import {expertProgress,expertKey,freshExpert} from './expert-state.js';
import {scenarioProgress,scenarioKey,freshScenario,scenarioHasSpeaking,scenarioLearnsFirst} from './scenario-state.js';
import {courseGroup,japaneseLessonUI} from './curriculum.js';
import {practiceHasWriting,practiceRoundCount,normalizePractice,normalizeCasePractice} from './practice-state.js';
import {basicLessons,freshBasic,nextBasic,basicSinglePass,basicHasIntro,basicGroup} from './basics-state.js';
import {freshKoreanProgress,nextKorean,koreanLessons,koreanHasSpeaking,koreanQuizOnly,koreanStageZero,koreanGroup,koreanGroups,koreanExplanation} from './korean-state.js';
import {freshKana,normalizeKana,kanaLessons,kanaRound,selectedLevel} from './kana-state.js';
import {freshLabels} from './labels-state.js';
import {freshListening} from './listening-state.js';
import {freshSentence,sentenceId,sentenceProgress,setSentenceProgress,nextSentence} from './sentence-state.js';
import {freshDialogue} from './dialogue-state.js';
import {freshReading} from './reading-state.js';
import {freshEpisode} from './engine.js';
import {caseTasks,practiceKey,practiceUnits} from './practice-content.js';
import {showSheet,closeSheet} from './sheet.js';
export function entryState(s,kind,id){
 if(kind==='expert')return {...s,expertActive:Number(id??0)};
 if(kind==='scenario')return {...s,scenarioActive:String(id??s.scenarioActive)};
 if(kind==='sentence')return {...s,sentenceActive:Number(id??nextSentence(s))};
 if(kind==='reading'&&id!==undefined)return {...s,onboardingLevel:Number(id)};
 if(kind==='basic')return {...s,basics:{...s.basics,active:Number(id??nextBasic(s))}};
 if(kind==='korean')return {...s,korean:{...s.korean,active:id??nextKorean(s).id}};
 if(kind==='kana'){const k=normalizeKana(s.kana);return {...s,kana:{...k,active:id!==undefined?Number(id):k.lessons[k.active].phase==='summary'?Math.max(0,k.lessons.findIndex(l=>!l.caseSolved)):k.active}};}
 return s;
}
export function lessonProgress(s,kind){
 if(kind==='video')return videoProgress(s);
 if(kind==='expert')return expertProgress(s);
 if(kind==='scenario')return scenarioProgress(s);
 if(kind==='sentence')return sentenceProgress(s);
 if(kind==='basic')return s.basics?.lessons?.[s.basics.active];
 if(kind==='korean')return s.korean?.lessons?.[s.korean.active];
 if(kind==='kana')return s.kana?.lessons[s.kana.active];
 if(kind==='reading')return s.readings?.[selectedLevel(s)];
 return s[kind==='play'?'episode':kind];
}
export function shouldOfferResume(s,kind){
 if(kind!=='expert'&&s.practices?.[practiceKey(s,kind)])return true;
 const p=lessonProgress(s,kind),phase=p?.phase||p?.step;
 if(!p?.started||['summary','done'].includes(phase)||(kind==='listening'&&p.index===4))return false;
 // Opening the first page sets started, but is not progress worth resuming.
 const initial=kind==='basic'?freshBasic(s.basics.active).phase:kind==='korean'?freshKoreanProgress(s.korean.active).phase:kind==='listening'?undefined:'intro';
 if(kind==='expert'&&p.resumePhase)return true;
 const effectivePhase=phase==='scenario'&&p.resumePhase?p.resumePhase:phase;
 return Boolean((p.index||p.lesson||0)>0||effectivePhase!==initial||p.selected!=null||p.retry||p.feedback||p.checked||p.tokens?.length||p.matches?.length);
}
export function restartLesson(s,kind){
 const next=structuredClone(s),old=lessonProgress(s,kind),fresh={expert:freshExpert,scenario:()=>freshScenario(next.scenarioActive),basic:()=>freshBasic(next.basics.active),korean:()=>freshKoreanProgress(next.korean.active),kana:()=>freshKana().lessons[0],labels:freshLabels,listening:freshListening,sentence:freshSentence,dialogue:freshDialogue,reading:freshReading,play:freshEpisode}[kind]();
 // Completion unlocks and accumulated records survive a new attempt.
 if('completed' in fresh)fresh.completed=Boolean(old?.completed);
 if('caseSolved' in fresh)fresh.caseSolved=Boolean(old?.caseSolved);
 if(kind==='expert'){next.experts||={};next.experts[expertKey(next)]=fresh;}
 else if(kind==='scenario'){next.scenarios||={};next.scenarios[scenarioKey(next)]=fresh;}
 else if(kind==='basic'){next.basics.lessons||={};next.basics.lessons[next.basics.active]=fresh;}
 else if(kind==='korean'){next.korean.lessons||={};next.korean.lessons[next.korean.active]=fresh;}
 else if(kind==='kana')next.kana.lessons[next.kana.active]=fresh;
 else if(kind==='reading'){next.readings||={};next.readings[selectedLevel(s)]=fresh;}
 else if(kind==='sentence')setSentenceProgress(next,sentenceId(next),fresh);
 else next[kind==='play'?'episode':kind]=fresh;
 if(next.practices)delete next.practices[practiceKey(s,kind)];
 return next;
}
export function lessonPercent(s,kind){
 const p=lessonProgress(s,kind)||{},practiceCount=caseTasks(s,kind)?.length??practiceUnits(s,kind).length,count=kind==='basic'?basicLessons.find(l=>l.id===s.basics.active).count:practiceUnits(s,kind).length;if(!count)return 0;
 let done=0,total=count*2;
 const i=p.index||0;
 if(kind==='kana'){
  total=count*3;const r=kanaRound(kanaLessons[s.kana.active],i);
  done=r.start*3+(p.phase==='learn'?i-r.start:p.phase==='reading'?r.letters.length+i-r.start:p.phase==='quiz'?r.letters.length*2+(p.matches?.length||0):0);
 }else if(kind==='basic'||kind==='korean'){
  const quizOnly=kind==='korean'&&koreanQuizOnly(koreanLessons.find(l=>l.id===s.korean.active));
  const steps=kind==='korean'&&koreanExplanation(s.korean.active)?1:quizOnly||kind==='basic'&&s.basics.active===10?1:(kind==='basic'&&basicSinglePass(s.basics.active)||kind==='korean'&&koreanStageZero(s.korean.active))?3:2;total=count*steps;done=i*steps+(p.phase==='write'?1:p.phase==='quiz'&&!quizOnly?steps-1:0);if(kind==='basic'&&basicHasIntro(s.basics.active)){const size=basicGroup(s.basics.active,i).size;total+=Math.ceil(count/size);done+=Math.floor(i/size)+(p.phase==='intro'?0:1);}
  if(kind==='korean'&&koreanExplanation(s.korean.active)){const groups=koreanGroups[s.korean.active],group=koreanGroup(s.korean.active,i);let preceding=0,start=0;for(const size of groups){if(start===group.start)break;start+=size;preceding++;}total+=groups.length;done+=preceding+(p.phase==='intro'?0:1);}
  if(kind==='korean'&&koreanHasSpeaking(s.korean.active)){total+=count;done+=i+(p.phase==='speak'?2:0);}
 }else if(kind==='labels'){total=count*3;done=p.phase==='match'?count*2+(p.matches?.length||0):i*2+(p.phase==='build'?1:0);}
 else if(kind==='listening'){total=count;done=i;}
 else if(kind==='sentence'){total=count*3+(sentenceId(s)===3?0:1);done=p.phase==='solve'?count*3:i*3+(p.phase==='arrange'?1:p.phase==='speak'?2:0);}
 else if(kind==='video'){total=(videoLesson(s)?.count||1)*2;done=i*2+(p.phase==='learn'?1:0);}
 else if(kind==='scenario'){const steps=scenarioHasSpeaking(s.scenarioActive)?3:scenarioLearnsFirst(s.scenarioActive)?2:1;total=3*steps;done=i*steps+(p.phase==='quiz'&&steps>1?1:p.phase==='speak'?2:0);}
 else if(kind==='dialogue'){done=p.phase==='practice'?count+i:p.phase==='learn'?i:0;}
 else if(kind==='reading'){total=12;done=Math.floor(i/2)*4+(p.phase==='intro'?0:p.phase==='learn'?1:2+i%2);}
 else if(kind==='play'){total=6;done={intro:0,learn:1+(p.lesson||0),investigate:3,solved:4,transfer:5,summary:6}[p.step]||0;}
 const modeCount=practiceHasWriting(practiceKey(s,kind))?2:1;
 const practice=normalizePractice(normalizeCasePractice(s.practices?.[practiceKey(s,kind)],practiceKey(s,kind)),practiceRoundCount(practiceKey(s,kind)),practiceHasWriting(practiceKey(s,kind)));
 if(practice)done=total+(practice.round*modeCount+(practice.mode===0?0:1))*practice.count+practice.index;
 else if(['summary','done'].includes(p.phase||p.step)||(kind==='listening'&&i===4))return 100;
 return Math.max(0,Math.min(99,Math.floor(done/(total+((kind==='basic'&&basicSinglePass(s.basics.active)||kind==='korean'&&koreanStageZero(s.korean.active))?0:practiceCount*practiceRoundCount(practiceKey(s,kind))*modeCount))*100)));
}
export function progressBar(s,kind){const value=lessonPercent(s,kind),jp=japaneseLessonUI(s);return `<div class="lesson-progress" role="progressbar" aria-label="${jp?'学習の進み具合':'학습 진행률'}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}" aria-valuetext="${value}%"><span style="width:${value}%"></span></div>`;}
export function askResume(jp=false){
 return new Promise(resolve=>{
  const focus=document.activeElement,dialog=document.createElement('dialog');dialog.className='lesson-resume';dialog.setAttribute('aria-labelledby','lesson-resume-title');
  dialog.innerHTML=`<h2 id="lesson-resume-title">${jp?'途中から続けますか？':'이어서 할까요?'}</h2><div class="button-pair"><button type="button" class="secondary" data-choice="restart">${jp?'最初から':'처음부터 하기'}</button><button type="button" class="primary" data-choice="resume">${jp?'続きから':'이어서 하기'}</button></div>`;
  document.body.append(dialog);let answer=null;
  dialog.addEventListener('close',()=>{dialog.remove();focus?.focus({preventScroll:true});resolve(answer);},{once:true});
  dialog.addEventListener('click',event=>{const choice=event.target.closest('[data-choice]');if(choice){answer=choice.dataset.choice;closeSheet(dialog);}else if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeSheet(dialog);}});
  showSheet(dialog);dialog.querySelector('[data-choice="resume"]').focus();
 });
}

// Center informational/handwriting pages only; answer selection and matching keep their layout.
export function centersLesson(s,kind,completed=false){
 if(completed)return true;
 const key=practiceKey(s,kind),practice=normalizePractice(normalizeCasePractice(s.practices?.[key],key),practiceRoundCount(key),practiceHasWriting(key));
 if(practice)return practice.mode===2;
 const p=lessonProgress(s,kind)||{},phase=p.phase||p.step;
 return ({kana:['intro','learn','reading','summary'],basic:['intro','learn','write'],korean:['scenario','intro','learn','write'],labels:['intro','read'],sentence:['intro','learn','summary'],dialogue:['intro','learn'],reading:['intro','learn'],play:['intro','learn','solved','summary']}[kind]||[]).includes(phase);
}
export function centerLesson(root,s,kind,completed=false){
 if(completed&&root.querySelector('main.practice-complete')){
  root.querySelector('.shell')?.classList.add('lesson-complete-shell');
  return;
 }
 const group=courseGroup(selectedLevel(s)),main=root.querySelector('main');
 if([5,7].includes(group)&&['reading','korean','scenario','expert'].includes(kind)&&!completed&&!main?.classList.contains('korean-speaking'))main?.classList.add(group===5?'level-four-lesson':'level-five-lesson');
 if(courseGroup(selectedLevel(s))>=2){
  root.querySelector('.shell')?.classList.add('lesson-top-shell');
  root.querySelector('main')?.classList.add('lesson-top');
 }
 if(!centersLesson(s,kind,completed))return;
 root.querySelector('.shell')?.classList.add('lesson-centered-shell');
 root.querySelector('main')?.classList.add('lesson-centered');
}
