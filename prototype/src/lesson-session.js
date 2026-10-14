import {practiceRoundCount,practiceModes,normalizePractice} from './practice-state.js';
import {basicLessons,freshBasic,nextBasic} from './basics-state.js';
import {freshKoreanProgress,nextKorean,koreanLessons,koreanQuizOnly} from './korean-state.js';
import {freshKana,normalizeKana,kanaLessons,kanaRound,selectedLevel} from './kana-state.js';
import {freshLabels} from './labels-state.js';
import {freshListening} from './listening-state.js';
import {freshSentence} from './sentence-state.js';
import {freshDialogue} from './dialogue-state.js';
import {freshReading} from './reading-state.js';
import {freshEpisode} from './engine.js';
import {practiceKey,practiceUnits} from './practice-content.js';
import {showSheet,closeSheet} from './sheet.js';
export function entryState(s,kind,id){
 if(kind==='basic')return {...s,basics:{...s.basics,active:Number(id??nextBasic(s))}};
 if(kind==='korean')return {...s,korean:{...s.korean,active:id??nextKorean(s).id}};
 if(kind==='kana'){const k=normalizeKana(s.kana);return {...s,kana:{...k,active:id!==undefined?Number(id):k.lessons[k.active].phase==='summary'?Math.max(0,k.lessons.findIndex(l=>!l.caseSolved)):k.active}};}
 return s;
}
export function lessonProgress(s,kind){
 if(kind==='basic')return s.basics?.lessons?.[s.basics.active];
 if(kind==='korean')return s.korean?.lessons?.[s.korean.active];
 if(kind==='kana')return s.kana?.lessons[s.kana.active];
 if(kind==='reading')return s.readings?.[selectedLevel(s)];
 return s[kind==='play'?'episode':kind];
}
export function shouldOfferResume(s,kind){
 const p=lessonProgress(s,kind);
 return Boolean(s.practices?.[practiceKey(s,kind)]||(p?.started&&!['summary','done'].includes(p.phase||p.step)&&!(kind==='listening'&&p.index===4)));
}
export function restartLesson(s,kind){
 const next=structuredClone(s),old=lessonProgress(s,kind),fresh={basic:()=>freshBasic(next.basics.active),korean:freshKoreanProgress,kana:()=>freshKana().lessons[0],labels:freshLabels,listening:freshListening,sentence:freshSentence,dialogue:freshDialogue,reading:freshReading,play:freshEpisode}[kind]();
 // Completion unlocks and accumulated records survive a new attempt.
 if('completed' in fresh)fresh.completed=Boolean(old?.completed);
 if('caseSolved' in fresh)fresh.caseSolved=Boolean(old?.caseSolved);
 if(kind==='basic'){next.basics.lessons||={};next.basics.lessons[next.basics.active]=fresh;}
 else if(kind==='korean'){next.korean.lessons||={};next.korean.lessons[next.korean.active]=fresh;}
 else if(kind==='kana')next.kana.lessons[next.kana.active]=fresh;
 else if(kind==='reading'){next.readings||={};next.readings[selectedLevel(s)]=fresh;}
 else next[kind==='play'?'episode':kind]=fresh;
 if(next.practices)delete next.practices[practiceKey(s,kind)];
 return next;
}
export function lessonPercent(s,kind){
 const p=lessonProgress(s,kind)||{},practiceCount=practiceUnits(s,kind).length,count=kind==='basic'?basicLessons.find(l=>l.id===s.basics.active).count:practiceCount;if(!count)return 0;
 let done=0,total=count*2;
 const i=p.index||0;
 if(kind==='kana'){
  total=count*3;const r=kanaRound(kanaLessons[s.kana.active],i);
  done=r.start*3+(p.phase==='learn'?i-r.start:p.phase==='reading'?r.letters.length+i-r.start:p.phase==='quiz'?r.letters.length*2+(p.matches?.length||0):0);
 }else if(kind==='basic'||kind==='korean'){
  const quizOnly=kind==='korean'&&koreanQuizOnly(koreanLessons.find(l=>l.id===s.korean.active));
  const steps=quizOnly||kind==='basic'&&s.basics.active===10?1:kind==='basic'&&[7,8].includes(s.basics.active)?3:2;total=count*steps;done=i*steps+(p.phase==='write'?1:p.phase==='quiz'&&!quizOnly?steps-1:0);if(kind==='basic'&&[7,8,9,10].includes(s.basics.active)){total++;done=p.phase==='intro'?0:done+1;}
 }else if(kind==='labels'){total=count*3;done=p.phase==='match'?count*2+(p.matches?.length||0):i*2+(p.phase==='build'?1:0);}
 else if(kind==='listening'){total=count;done=i;}
 else if(kind==='sentence'){total=count*2+1;done=p.phase==='solve'?count*2:i*2+(p.phase==='arrange'?1:0);}
 else if(kind==='dialogue'){done=p.phase==='practice'?count+i:p.phase==='learn'?i:0;}
 else if(kind==='reading'){total=6;done=i;}
 else if(kind==='play'){total=6;done={intro:0,learn:1+(p.lesson||0),investigate:3,solved:4,transfer:5,summary:6}[p.step]||0;}
 const practice=normalizePractice(s.practices?.[practiceKey(s,kind)],practiceRoundCount(practiceKey(s,kind)));
 if(practice)done=total+(practice.round*practiceModes.length+(practice.mode===0?0:1))*practice.count+practice.index;
 else if(['summary','done'].includes(p.phase||p.step)||(kind==='listening'&&i===4))return 100;
 return Math.max(0,Math.min(99,Math.floor(done/(total+(kind==='basic'&&[7,8].includes(s.basics.active)?0:practiceCount*practiceRoundCount(practiceKey(s,kind))*practiceModes.length))*100)));
}
export function progressBar(s,kind){const value=lessonPercent(s,kind),jp=s.courseDirection==='ja-ko'||selectedLevel(s)>=6;return `<div class="lesson-progress" role="progressbar" aria-label="${jp?'学習の進み具合':'학습 진행률'}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}" aria-valuetext="${value}%"><span style="width:${value}%"></span></div>`;}
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
