import {insertComparisonLessons} from './comparison-attachments.js';
import {levelsFor,displayLevel} from './curriculum.js';
import {scenarioLessons,scenarioProgress,scenarioTitle,scenarioAvailable} from './scenario-state.js';
import {videosForCourse,videoProgress} from './video-lesson-state.js';
import {songsForCourse,songProgress} from './song-state.js';
import {orderLessons} from './lesson-order.js';
import {expertCatalog,expertProgress} from './expert-state.js';
import {basicLessons,basicProgress} from './basics-state.js';
import {koreanLessons,koreanProgress} from './korean-state.js';
import {sentenceLessons,sentenceProgress} from './sentence-state.js';
import {kanaLessons,normalizeKana} from './kana-state.js';
import {dialogueProgress} from './dialogue-state.js';
import {readingProgress} from './reading-state.js';
// Mirror map ordering using metadata only; opening reviews does not load lesson copy/audio.
export function studyCatalog(state){
 const result=[],direction=state.courseDirection;
 for(const level of levelsFor(direction)){
  const s={...state,onboardingLevel:level};let lessons=[];
  const add=(kind,id,title,completed,entryLevel=level)=>lessons.push({kind,id,title,completed:Boolean(completed),level:entryLevel,key:`${direction}:${kind}:${id}`});
  if(level===7)expertCatalog[direction].forEach((l,id)=>add('expert',id,l.title,expertProgress(s,id).completed));
  else if(direction==='ja-ko')koreanLessons.filter(l=>!l.retired&&l.level===level).forEach(l=>add('korean',l.id,l.title,koreanProgress(s,l.id).completed));
  else if(level===0){const k=normalizeKana(s.kana);kanaLessons.forEach((l,id)=>add('kana',id,l.caseTitle,k.lessons[id]?.caseSolved));basicLessons.filter(l=>l.id!==6).forEach(l=>add('basic',l.id,l.title,basicProgress(s,l.id).completed));}
  else if(level===2)sentenceLessons.forEach(l=>add('sentence',l.id,l.title,sentenceProgress(s,l.id).completed));
  else if(level===4)add('dialogue',0,'따뜻한 커피를 포장해요',dialogueProgress(s).completed);
  else [5,6].forEach(id=>add('reading',id,id===5?'안내·메시지에서 정보 찾기':'조건과 이유를 연결해 판단하기',readingProgress(s,id).completed,id));
  scenarioLessons.filter(l=>l.level===level&&l.id!=='5'&&scenarioAvailable(state,l)).sort((a,b)=>a.number[direction]-b.number[direction]).forEach(l=>add('scenario',l.id,scenarioTitle(s,l),scenarioProgress(s,l.id).completed));
  const specialLessons=videosForCourse(s).map(l=>({kind:'video',id:l.id,number:l.number,replaces:l.replaces,title:l.title,completed:videoProgress(s,l.id).completed,level,key:`${direction}:video:${l.id}`}));
  specialLessons.push(...songsForCourse(s).map(l=>({kind:'song',id:l.id,number:l.number,replaces:l.replaces,title:l.title,completed:songProgress(s,l.id).completed,level,key:`${direction}:song:${l.id}`})));
  lessons=insertComparisonLessons(orderLessons(lessons,specialLessons),direction,c=>({kind:'korean',id:c.id,title:c.title,completed:koreanProgress(s,c.id).completed,level:c.level,key:`${direction}:korean:${c.id}`}));
  for(const [i,l] of lessons.entries())result.push({...l,position:`${displayLevel(level)}-${i+1}`,number:i+1});
 }
 return result;
}
