import {comparisonCourseCatalog,isComparisonCourse,comparisonContentVersion} from './comparison-course-catalog.js';
export {isComparisonCourse};
import {isParticleCourse,particleContentVersion,legacyParticleChoices} from './particle-course-catalog.js';
export {isParticleCourse};
import {pronunciationCourseCatalog,isPronunciationCourse,pronunciationContentVersion} from './pronunciation-course-catalog.js';
export {isPronunciationCourse};
import {courseGroup} from './curriculum.js';
export const koreanLessons=[
 ...[['文字を学ぶ · 基本',20],['文字を使う · 基本',20],['文字を学ぶ · ヤ・ヨ・ユ',4],['文字を使う · ヤ・ヨ・ユ',4],['文字を学ぶ · 濃音',5],['文字を使う · 濃音',5],['文字を学ぶ · 複合母音',11],['文字を使う · 複合母音',11],['文字を学ぶ · パッチム',14],['文字を使う · パッチム',14]].map(([title,count],i)=>({id:`1-${i+1}`,level:0,title,count,practice:i%2===1})),
 ...pronunciationCourseCatalog,
 ...comparisonCourseCatalog,
 {id:'1-11',retired:true,level:2,title:'身近な単語',count:6},
 {id:'2-1',retired:true,level:2,title:'お店で使う言葉',count:6},{id:'3-1',level:2,title:'交流会で自己紹介する',count:6},{id:'3-4',level:2,title:'カフェでかばんを探す',count:3},{id:'3-2',level:2,title:'コンビニで買い物する',count:3},{id:'3-3',level:2,title:'駅で友達と会う',count:3},{id:'4-1',level:4,title:'カフェで注文する',count:6},{id:'5-1',level:5,title:'案内と意見を読む',count:3},{id:'6-1',level:5,title:'条件と理由を読み解く',count:3},{id:'7-1',level:7,title:'전문 논설 읽기',count:3}
];
export const koreanHasSpeaking=id=>koreanLessons.some(l=>l.id===id&&(l.level===2||l.level===8)&&!l.retired);
export const koreanStageZero=id=>koreanLessons.some(l=>l.id===id&&l.level===0);
export const koreanExplanation=id=>koreanLessons.some(l=>l.id===id&&l.level===0&&!l.practice);
export const koreanGroups={'1-1':[3,3,4,4,3,3],'1-2':[3,3,4,4,3,3],'1-3':[4],'1-4':[4],'1-5':[5],'1-6':[5],'1-7':[4,4,3],'1-8':[4,4,3],'1-9':[3,3,2,3,3],'1-10':[3,3,2,3,3]};
export function koreanGroup(id,index=0){let start=0;for(const size of koreanGroups[id]||[]){if(index<start+size)return {start,end:start+size,size};start+=size;}return null;}
export const koreanCase=id=>koreanLessons.some(l=>l.id===id&&!l.retired&&l.level>0&&l.level!==8&&!isComparisonCourse(id));
const reorderedBasics={'1-1':10,'1-2':10,'1-3':14,'1-4':14};
export const freshKoreanProgress=id=>({...reorderedBasics[id]?{contentVersion:1}:isPronunciationCourse(id)?{contentVersion:pronunciationContentVersion}:isComparisonCourse(id)?{contentVersion:comparisonContentVersion(id)}:{},index:0,phase:koreanExplanation(id)?'intro':koreanCase(id)?'scenario':'learn',selected:null,retry:false,started:false,completed:false});
export const koreanProgress=(s,id)=>s.korean?.lessons?.[id]||freshKoreanProgress(id);
export const koreanUnlocked=(s,id)=>koreanLessons.some(l=>l.id===id&&(!isPronunciationCourse(id)&&!isComparisonCourse(id)||s.courseDirection==='ja-ko'));
export function nextKorean(s){const lessons=koreanLessons.filter(l=>!l.retired&&l.level===courseGroup(s.onboardingLevel??0));return lessons.find(l=>l.id===s.korean?.active&&koreanUnlocked(s,l.id)&&!koreanProgress(s,l.id).completed)||lessons.find(l=>koreanUnlocked(s,l.id)&&!koreanProgress(s,l.id).completed)||lessons.at(-1);}
const comparisonShape=(l,p)=>p.contentVersion===comparisonContentVersion(l.id)?l:legacyParticleChoices[l.id];
export function validKorean(k){return k===undefined||Boolean([1,2,3,4].includes(k?.version)&&koreanLessons.some(l=>l.id===k.active)&&k.lessons&&typeof k.lessons==='object'&&!Array.isArray(k.lessons)&&Object.entries(k.lessons).every(([id,p])=>{const l=koreanLessons.find(l=>l.id===id);return l&&p&&(!isComparisonCourse(id)||Boolean(comparisonShape(l,p)))&&Number.isInteger(p.index)&&p.index>=0&&p.index<(k.version===1&&l.level===0?[6,4,7,7,5,11,6,6,6,4][Number(id.split('-')[1])-1]:reorderedBasics[id]&&p.contentVersion!==1?Math.max(l.count,reorderedBasics[id]):l.count)&&(k.version===4&&l.level===0?(l.practice?['learn','write','quiz','done']:['intro','learn','done']):k.version===3&&l.level===0?['intro','learn','write','quiz','done']:[...(koreanCase(id)?['scenario']:[]),'learn','quiz','done',...(isComparisonCourse(id)?['review']:[]),...(koreanHasSpeaking(id)?['speak']:[])]).includes(p.phase)&&(isComparisonCourse(id)?p.selected===null||Number.isInteger(p.selected)&&p.selected>=0&&p.selected<comparisonShape(l,p).choiceCounts[p.index]:(k.version>=3&&l.level===0?[null,0,1,2,3]:[null,0,1,2]).includes(p.selected))&&(!isComparisonCourse(id)||!p.retry||p.phase==='quiz'&&p.selected!==null)&&(!isComparisonCourse(id)||p.phase!=='review'||p.selected===comparisonShape(l,p).answers[p.index]&&!p.retry)&&['retry','started','completed'].every(f=>typeof p[f]==='boolean')&&(p.phase!=='done'||p.completed);})&&(!k.history||(k.history.version===1&&/^\d{4}-\d{2}-\d{2}$/.test(k.history.startedOn)&&k.history.days&&typeof k.history.days==='object'&&!Array.isArray(k.history.days)&&Object.entries(k.history.days).every(([day,p])=>/^\d{4}-\d{2}-\d{2}$/.test(day)&&['letters','expressions','sentences','cases'].every(f=>Number.isSafeInteger(p[f])&&p[f]>=0)))));}
export function normalizeKorean(k){
 if(!k||k.version===4&&Object.entries(k.lessons).every(([id,p])=>(!reorderedBasics[id]||p.contentVersion===1)&&(!isParticleCourse(id)||p.contentVersion===particleContentVersion)&&(!isPronunciationCourse(id)||p.contentVersion===pronunciationContentVersion&&p.phase!=='quiz'&&p.selected===null&&!p.retry)))return k;
 const next=structuredClone(k);
 if(k.version===1){next.legacyLetters=structuredClone(k.lessons);next.lessons=Object.fromEntries(Object.entries(k.lessons).filter(([id])=>!id.startsWith('1-')));if(k.active.startsWith('1-'))next.active='1-1';}
 next.version=4;
 for(const [id,p] of Object.entries(next.lessons))if(isPronunciationCourse(id)){
  // New sentences replace syllable drills. Completed lessons/history remain intact.
  if(p.contentVersion!==pronunciationContentVersion){
   if(id!=='15-10'&&p.phase!=='done'){p.index=0;p.phase='learn';}
   p.contentVersion=pronunciationContentVersion;
  }
  if(p.phase==='quiz')p.phase='learn';p.selected=null;p.retry=false;
 }
 for(const [id,p] of Object.entries(next.lessons))if(isParticleCourse(id)&&p.contentVersion!==particleContentVersion){
  // Keep completion/history, restart only the replaced in-progress material.
  p.contentVersion=particleContentVersion;p.selected=null;p.retry=false;
  if(p.phase!=='done'){p.index=0;p.phase='learn';}
 }
 for(const [id,p] of Object.entries(next.lessons))if(koreanStageZero(id)){
  if(reorderedBasics[id]&&p.contentVersion!==1){p.contentVersion=1;p.index=p.phase==='done'?koreanLessons.find(l=>l.id===id).count-1:0;p.selected=null;p.retry=false;if(p.phase!=='done')p.phase=koreanExplanation(id)?'intro':'learn';}
  if(p.phase==='done')continue;
  const explanation=koreanExplanation(id);
  if(!p.started)p.phase=explanation?'intro':'learn';
  else if(explanation&&['write','quiz'].includes(p.phase)||!explanation&&p.phase==='intro')p.phase='learn';
  if(p.phase!=='quiz'){p.selected=null;p.retry=false;}
 }
 return next;
}
export const koreanQuizOnly=l=>Boolean(l.level!==0&&!isComparisonCourse(l.id)&&(l.practice||l.level>=5&&l.retired));
export function reduceKorean(s,a,now=new Date()){
 const k=structuredClone(normalizeKorean(s.korean)||{version:4,active:'1-1',lessons:{}}),id=a.type==='korean-start'?a.id:k.active,l=koreanLessons.find(l=>l.id===id);
 if(!l||!koreanUnlocked(s,id))return s.korean;
 if(a.type==='korean-start'){k.active=id;const old=k.lessons[id]||freshKoreanProgress(id);k.lessons[id]=old.phase==='done'?{...freshKoreanProgress(id),started:true,completed:true,phase:koreanExplanation(id)?'intro':koreanQuizOnly(l)?'quiz':'learn'}:{...old,started:true};if(koreanQuizOnly(l))k.lessons[id].phase='quiz';const p=k.lessons[id];if(koreanCase(id)&&(!p.caseSeen||old.phase==='done')){if(p.phase!=='scenario')p.resumePhase=p.phase;p.phase='scenario';}return k;}
 const p=k.lessons[id];if(!p?.started)return s.korean;
 if(isComparisonCourse(id)){
  if(a.type==='korean-next'){
   if(p.phase==='learn'){p.phase='quiz';p.selected=null;p.retry=false;}
   else if(p.phase==='review')finishItem(k,l,p,now);
  }
  if(a.type==='korean-previous'){
   if(p.phase==='quiz'||p.phase==='review')p.phase='learn';
   else if(p.phase==='learn'&&p.index>0)p.index--;
   p.selected=null;p.retry=false;
  }
  if(a.type==='korean-select'&&p.phase==='quiz'&&[0,1,2].includes(Number(a.id))&&Number(a.id)<l.choiceCounts[p.index]){p.selected=p.selected===Number(a.id)?null:Number(a.id);p.retry=false;}
  if(a.type==='korean-check'&&p.phase==='quiz'&&p.selected!==null){
   p.retry=p.selected!==l.answers[p.index];
   if(!p.retry)p.phase='review';
  }
  return k;
 }
 if(isPronunciationCourse(id)){
  if(a.type==='korean-next'&&p.phase==='learn')p.phase='speak';
  if(a.type==='korean-previous'){if(p.phase==='speak')p.phase='learn';else if(p.phase==='learn'&&p.index>0)p.index--;}
  if(a.type==='korean-speak-next'&&p.phase==='speak')finishItem(k,l,p,now);
  return k;
 }
 if(a.type==='korean-next'&&p.phase==='scenario'){p.phase=p.resumePhase||'learn';delete p.resumePhase;p.caseSeen=true;return k;}
 if(a.type==='korean-next'&&p.phase==='intro'){p.phase='learn';return k;}
 if(a.type==='korean-next'&&p.phase==='learn'&&koreanExplanation(id)){finishItem(k,l,p,now);return k;}
 if(a.type==='korean-next'&&['learn','write'].includes(p.phase)){p.phase=l.level===0&&p.phase==='learn'&&!(id==='1-10'&&p.index>=6)?'write':'quiz';p.selected=null;p.retry=false;}
 if(a.type==='korean-previous'){
  if(l.level===0){if(p.phase==='quiz')p.phase=id==='1-10'&&p.index>=6?'learn':'write';else if(p.phase==='write')p.phase='learn';else if(p.phase==='learn'&&koreanExplanation(id)&&p.index===koreanGroup(id,p.index).start)p.phase='intro';else if(p.index>0){p.index--;p.phase='learn';}}
  else if(p.phase==='learn'&&p.index===0&&koreanCase(id)){p.phase='scenario';}else if(p.phase==='speak')p.phase='quiz';else if(p.phase==='quiz'&&!koreanQuizOnly(l))p.phase='learn';else if(p.index>0){p.index--;p.phase=koreanQuizOnly(l)?'quiz':'learn';}
  p.selected=null;p.retry=false;
 }
 if(a.type==='korean-select'&&p.phase==='quiz'&&(l.level===0?[0,1,2,3]:[0,1,2]).includes(Number(a.id))){p.selected=l.practice&&p.selected===Number(a.id)?null:Number(a.id);p.retry=false;}
 if(a.type==='korean-check'&&p.phase==='quiz'&&p.selected!==null){
  if(p.selected!==p.index%(l.level===0?4:3)){p.retry=true;return k;}
  if(koreanHasSpeaking(id)){p.phase='speak';p.selected=null;p.retry=false;return k;}
  finishItem(k,l,p,now);
 }
 if(a.type==='korean-speak-next'&&koreanHasSpeaking(id)&&p.phase==='speak')finishItem(k,l,p,now);
 return k;
}

function finishItem(k,l,p,now){
 const day=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 const h=k.history||={version:1,startedOn:day,days:{}},d=h.days[day]||={letters:0,expressions:0,sentences:0,cases:0};
 d[l.level===0||l.level===8?'letters':l.level<=2?'expressions':'sentences']++;
 p.selected=null;p.retry=false;
 if(p.index+1<l.count){p.index++;p.phase=koreanCase(l.id)&&l.level>=5?'scenario':koreanExplanation(l.id)&&p.index===koreanGroup(l.id,p.index).start?'intro':koreanQuizOnly(l)?'quiz':'learn';}
 else{if(!p.completed)d.cases++;p.completed=true;p.phase='done';}
}

export function followingKorean(id){const lesson=koreanLessons.find(l=>l.id===id),list=koreanLessons.filter(l=>!l.retired&&l.level===lesson?.level);return list[list.findIndex(l=>l.id===id)+1];}
