import {sentenceId,setSentenceProgress} from './sentence-state.js';
import {japaneseLessonUI} from './curriculum.js';
import {basicLessons,basicSinglePass,basicHasIntro,basicGroup} from './basics-state.js';
import {isCasePractice,normalizeCasePractice,practiceHasWriting,practiceRoundCount,normalizePractice} from './practice-state.js';
import {developmentMode} from './build-config.js';
import {lessonProgress} from './lesson-session.js';
import {kanaLessons,kanaRound,selectedLevel} from './kana-state.js';
import {koreanCase,koreanLessons,koreanQuizOnly,koreanStageZero,koreanGroup,koreanExplanation} from './korean-state.js';
import {labelWords} from './labels-state.js';
import {readingAnswers} from './reading-state.js';
import {caseTasks,practiceKey,practiceUnits} from './practice-content.js';

// Stable phase numbers keep existing practice saves compatible.
const modesFor=(s,kind)=>practiceHasWriting(practiceKey(s,kind))?[0,2]:[0];
function originals(s,kind,count){
 const pages=[],add=(phase,index=0,extra={})=>pages.push({...(phase?{phase}:{}),index,...extra});
 if(kind==='kana'){
  const lesson=kanaLessons[s.kana.active];
  for(let start=0;start<count;){const r=kanaRound(lesson,start);add('intro',start);for(let i=start;i<r.end;i++)add('learn',i);for(let i=start;i<r.end;i++)add('reading',i);add('quiz',start);start=r.end;}
 }else if(kind==='basic'||kind==='korean'){
  if(kind==='korean'&&koreanCase(s.korean.active)&&!['5-1','6-1','7-1'].includes(s.korean.active))add('scenario');
  const quizOnly=kind==='korean'&&koreanQuizOnly(koreanLessons.find(l=>l.id===s.korean.active));
  if(kind==='basic'&&s.basics.active<11&&basicHasIntro(s.basics.active))add('intro');
  for(let i=0;i<count;i++){if(kind==='korean'&&['5-1','6-1','7-1'].includes(s.korean.active))add('scenario',i);if(kind==='korean'&&koreanExplanation(s.korean.active)&&i===koreanGroup(s.korean.active,i).start)add('intro',i);if(kind==='basic'&&s.basics.active>=11&&i===basicGroup(s.basics.active,i).start)add('intro',i);if(!quizOnly)add('learn',i);if(kind==='korean'&&koreanExplanation(s.korean.active))continue;if(kind==='basic'&&basicSinglePass(s.basics.active)||kind==='korean'&&koreanStageZero(s.korean.active))add('write',i);if(kind!=='basic'||s.basics.active!==10)add('quiz',i);}
 }else if(kind==='labels'){add('intro');for(let i=0;i<count;i++){add('read',i);add('build',i);}add('match',count-1);}
 else if(kind==='listening'){for(let i=0;i<count;i++)add('',i);}
 else if(kind==='sentence'){add('intro');for(let i=0;i<count;i++){add('learn',i);add('arrange',i);}if(sentenceId(s)!==3)add('solve',count-1);}
 else if(kind==='dialogue'){add('intro');for(let i=0;i<3;i++)add('learn',i);for(let i=0;i<3;i++)add('practice',i);}
 else if(kind==='reading'){for(let i=0;i<6;i++){if(i%2===0){add('intro',i);add('learn',i);}add('read',i);}}
 else if(kind==='play')for(const [step,lesson,transfer] of [['intro',0],['learn',0],['learn',1],['investigate',1],['solved',1],['transfer',1,'not_attempted'],['transfer',1,'passed']])pages.push({step,lesson,...(transfer?{transfer}:{})});
 return pages;
}
export function devLessonPosition(s,kind){
 const modes=modesFor(s,kind),unitCount=practiceUnits(s,kind).length,count=caseTasks(s,kind)?.length??unitCount,pages=originals(s,kind,kind==='basic'?basicLessons.find(l=>l.id===s.basics.active).count:unitCount),practice=normalizePractice(normalizeCasePractice(s.practices?.[practiceKey(s,kind)],practiceKey(s,kind)),practiceRoundCount(practiceKey(s,kind)),practiceHasWriting(practiceKey(s,kind))),p=lessonProgress(s,kind)||{};
 let index=practice?pages.length+(practice.round*modes.length+Math.max(0,modes.indexOf(practice.mode)))*count+practice.index:pages.findIndex(x=>Object.entries(x).every(([k,v])=>p[k]===v));
 if(index<0)index=pages.length-1;
 return {index,total:pages.length+((kind==='basic'&&basicSinglePass(s.basics.active)||kind==='korean'&&koreanStageZero(s.korean.active))?0:count*modes.length*practiceRoundCount(practiceKey(s,kind))),pages,count};
}
function setProgress(s,kind,p){
 if(kind==='kana')s.kana.lessons[s.kana.active]=p;
 else if(kind==='basic')s.basics.lessons[s.basics.active]=p;
 else if(kind==='korean')s.korean.lessons[s.korean.active]=p;
 else if(kind==='reading'){s.readings||={};s.readings[selectedLevel(s)]=p;}
 else if(kind==='sentence')setSentenceProgress(s,sentenceId(s),p);
 else s[kind==='play'?'episode':kind]=p;
}
function cleanProgress(p){
 const next={...p,started:true};
 for(const [key,value] of Object.entries({selected:null,retry:false,feedback:'',checked:false,answered:false,matches:[],tiles:[],tokens:[]}))if(key in next)next[key]=value;
 return next;
}
function completion(s,kind,p){
 if(kind==='kana'){p.matches=kanaRound(kanaLessons[s.kana.active],p.index).letters.map(l=>l.id);p.answered=true;return {type:'kana-next'};}
 if(kind==='basic'&&[7,8,10].includes(s.basics.active))return {type:'basic-next'};
 if(kind==='korean'&&koreanExplanation(s.korean.active))return {type:'korean-next'};
 if(kind==='basic'||kind==='korean'){p.selected=p.index%(kind==='korean'&&koreanStageZero(s.korean.active)?4:3);return {type:`${kind}-check`};}
 if(kind==='labels'){p.matches=labelWords.slice(0,-1).map(l=>l.id);const id=labelWords.at(-1).id;return {type:'labels-match',left:id,right:id};}
 if(kind==='listening')return {type:'listening-answer',id:'kasa'};
 if(kind==='sentence'){if(sentenceId(s)===3){p.selected=String(p.index%3);return {type:'sentence-check'};}p.selected=sentenceId(s)===0?'window-blue':String(sentenceId(s));return {type:'sentence-submit'};}
 if(kind==='dialogue'){p.selected=0;return {type:'dialogue-check'};}
 if(kind==='reading'){p.solved=[0,1,2,3,4];p.selected=readingAnswers[selectedLevel(s)][5];return {type:'reading-check'};}
 p.transfer='passed';return {type:'next'};
}
export function seekDevLesson(s,kind,offset){
 if(!developmentMode||![-1,1].includes(offset))return s;
 const modes=modesFor(s,kind);
 const {index,total,pages,count}=devLessonPosition(s,kind),target=Math.max(0,Math.min(total-1,index+offset));if(target===index)return s;
 const next=structuredClone(s),key=practiceKey(s,kind),p=cleanProgress(lessonProgress(next,kind));
 next.practices||={};delete next.practices[key];
 Object.assign(p,pages[Math.min(target,pages.length-1)]);
 if(target>=pages.length){const n=target-pages.length,action=completion(next,kind,p);next.practices[key]={version:1,...(isCasePractice(key)?{caseVersion:1}:{}),round:Math.floor(n/(count*modes.length)),mode:modes[Math.floor(n/count)%modes.length],index:n%count,count,action};}
 setProgress(next,kind,p);return next;
}
export function renderDevLessonTools(s,kind){
 if(!developmentMode)return '';
 const {index,total}=devLessonPosition(s,kind),jp=japaneseLessonUI(s);
 return `<nav class="dev-lesson-tools" aria-label="${jp?'開発用の画面移動':'개발용 학습 화면 이동'}"><button type="button" data-action="dev-lesson-previous" aria-label="${jp?'前の画面':'이전 화면'}" ${index===0?'disabled':''}>&lt;</button><output aria-live="polite">${index+1} / ${total}</output><button type="button" data-action="dev-lesson-next" aria-label="${jp?'次の画面':'다음 화면'}" ${index===total-1?'disabled':''}>&gt;</button></nav>`;
}

let floatingPosition;
export function mountDevLessonTools(root){
 const bar=root.querySelector('.dev-lesson-tools');if(!bar)return ()=>{};
 const handle=bar.querySelector('output');let drag=null,frame;
 const bounds=()=>({w:bar.offsetWidth,h:bar.offsetHeight,maxX:innerWidth-bar.offsetWidth-12,maxY:innerHeight-bar.offsetHeight-48});
 const place=(x,y)=>{const b=bounds();bar.style.left=`${Math.max(12,Math.min(b.maxX,x))}px`;bar.style.top=`${Math.max(48,Math.min(b.maxY,y))}px`;};
 const arrange=()=>{
  if(drag)return;const b=bounds();
  const occupied=[...root.querySelectorAll('button,a,input,select,textarea,h1,h2,h3,p,img,canvas,svg,.text-phrase,.kana-vowel-motion,.basic-letter-motion,.basic-word,.basic-sound-change,.practice-writing-reference,.kana-letter,.practice-target,.practice-guide,.practice-answer,.map-choice,.korean-letter-motion,.korean-zero-glyph,.korean-letter-equation')].filter(el=>!bar.contains(el)&&el.getClientRects().length).map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height&&r.bottom>0&&r.top<innerHeight);
  const overlap=(x,y)=>occupied.reduce((sum,r)=>sum+Math.max(0,Math.min(x+b.w+6,r.right)-Math.max(x-6,r.left))*Math.max(0,Math.min(y+b.h+6,r.bottom)-Math.max(y-6,r.top)),0);
  if(floatingPosition){const {x,y}=floatingPosition;if(x>=12&&x<=b.maxX&&y>=48&&y<=b.maxY&&!overlap(x,y)){place(x,y);return;}}
  let best={x:b.maxX,y:b.maxY,score:Infinity};
  for(let y=b.maxY;y>=48;y-=12)for(const x of [b.maxX,12,(innerWidth-b.w)/2]){const score=overlap(x,y);if(score<best.score)best={x,y,score};if(!score){place(x,y);return;}}
  place(best.x,best.y);
 };
 const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(arrange);};
 const down=e=>{if(e.button!==0||e.isPrimary===false)return;const r=bar.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX-r.x,y:e.clientY-r.y};handle.setPointerCapture(e.pointerId);bar.classList.add('is-dragging');e.preventDefault();};
 const move=e=>{if(drag?.id!==e.pointerId)return;place(e.clientX-drag.x,e.clientY-drag.y);};
 const up=e=>{if(drag?.id!==e.pointerId)return;const r=bar.getBoundingClientRect();floatingPosition={x:r.x,y:r.y};drag=null;bar.classList.remove('is-dragging');if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);};
 handle.addEventListener('pointerdown',down);handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up);
 window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,{passive:true});const observer=new ResizeObserver(schedule);observer.observe(root);arrange();
 return ()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule);handle.removeEventListener('pointerdown',down);handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',up);};
}
