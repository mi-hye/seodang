import {discussionProgress,validDiscussion,advanceDiscussion,discussionPercent} from './expert-discussion-state.js';
export const expertCatalog={
 'ko-ja':[{title:'오늘 저녁, 어디서 먹을까?',sentences:18,answers:[2,0],choices:4},{title:'여행, 어떻게 즐길까?',sentences:17,answers:[3,1],choices:4},{title:'답장이 늦어서 서운할 때',sentences:17,answers:[0,2],choices:4},{title:'이번 주말은 쉬고 싶어',sentences:12,answers:[0,1,2],choices:3}],
 'ja-ko':[{title:'오늘 저녁, 어디서 먹을까?',sentences:5,answers:[0],choices:3},{title:'여행, 어떻게 즐길까?',sentences:4,answers:[1],choices:3},{title:'답장이 늦어서 서운할 때',sentences:6,answers:[2],choices:3},{title:'이번 주말은 쉬고 싶어',sentences:13,answers:[0,1,2],choices:3}]
};
export const expertKey=(s,id=s.expertActive??0)=>`${s.courseDirection}:expert:${id}`;
export const freshExpert=()=>({phase:'intro',index:0,sentence:0,selected:null,retry:false,checked:false,attempts:0,started:false,completed:false,solved:[]});
export function expertProgress(s,id=s.expertActive??0){
 const saved=s.experts?.[expertKey(s,id)];if(saved)return discussionProgress(saved);
 const p=freshExpert(),ja=s.courseDirection==='ko-ja';
 const old=id===3?s.scenarios?.[`${s.courseDirection}:scenario:5`]:ja?s.readings?.[7]:s.korean?.lessons?.['7-1'];
 if(!old)return discussionProgress(p);
 p.completed=Boolean(old.completed);if(p.completed){p.phase='done';return discussionProgress(p);}
 const legacyIndex=id===3?0:ja?id*2:id;
 if(old.started&&(id===3||old.index===legacyIndex||ja&&old.index===legacyIndex+1)){
  p.started=true;
  if(id===3){p.solved=Array.from({length:old.index+(old.checked?1:0)},(_,i)=>i);}
  else if(ja)p.solved=(old.solved||[]).filter(i=>i>=id*2&&i<id*2+2).map(i=>i-id*2);
  p.index=Math.min(p.solved.length,expertCatalog[s.courseDirection][id].answers.length-1);
  p.resumePhase=p.solved.length===expertCatalog[s.courseDirection][id].answers.length?'review':'read';
  p.phase='intro';
 }
 return discussionProgress(p);
}
export function validExperts(s){
 if(s.expertActive!==undefined&&(!Number.isInteger(s.expertActive)||s.expertActive<0||s.expertActive>3))return false;
 if(s.experts===undefined)return true;
 return Boolean(s.experts&&typeof s.experts==='object'&&!Array.isArray(s.experts)&&Object.entries(s.experts).every(([key,p])=>{
  const m=key.match(/^(ko-ja|ja-ko):expert:([0-3])$/);if(!m)return false;const c=expertCatalog[m[1]][Number(m[2])];
  if(p?.discussionVersion!==undefined)return validDiscussion(p)&&['started','completed'].every(k=>typeof p[k]==='boolean')&&Number.isSafeInteger(p.attempts)&&p.attempts>=0&&(p.phase!=='done'||p.completed);
  return p&&(p.resumePhase===undefined||p.phase==='intro'&&['read','review'].includes(p.resumePhase))&&['intro','read','quiz','review','done'].includes(p.phase)&&Number.isInteger(p.index)&&p.index>=0&&p.index<c.answers.length&&Number.isInteger(p.sentence)&&p.sentence>=0&&p.sentence<c.sentences&&[null,...Array.from({length:c.choices},(_,i)=>i)].includes(p.selected)&&['retry','checked','started','completed'].every(k=>typeof p[k]==='boolean')&&Number.isSafeInteger(p.attempts)&&p.attempts>=0&&Array.isArray(p.solved)&&new Set(p.solved).size===p.solved.length&&p.solved.every(i=>Number.isInteger(i)&&i>=0&&i<c.answers.length)&&(!['review','done'].includes(p.phase)||p.completed||p.solved.length===c.answers.length)&&(p.phase!=='done'||p.completed);
 }));
}
export function reduceExpert(s,a){
 if(s.onboardingLevel!==7)return s;
 const id=a.type==='expert-start'?Number(a.id):s.expertActive,c=expertCatalog[s.courseDirection]?.[id];if(!c)return s;
 const p=structuredClone(expertProgress(s,id));
 let next=p;if(a.type==='expert-start'){if(a.restart||p.phase==='done')next=discussionProgress({...freshExpert(),completed:p.completed});next.started=true;}else if(p.started)next=advanceDiscussion(p,a);else return s;
 return {...s,expertActive:id,experts:{...s.experts,[expertKey(s,id)]:next}};
}
export function expertPercent(s){return discussionPercent(expertProgress(s));}
