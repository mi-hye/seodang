export const expertCatalog={
 'ko-ja':[{title:'評価という装置',sentences:18,answers:[2,0],choices:4},{title:'「異論はない」の意味',sentences:17,answers:[3,1],choices:4},{title:'保存される街、消える暮らし',sentences:17,answers:[0,2],choices:4},{title:'調査結果をどう読むか',sentences:12,answers:[0,1,2],choices:3}],
 'ja-ko':[{title:'평가 지표의 한계',sentences:5,answers:[0],choices:3},{title:'설명회 발언의 속뜻',sentences:4,answers:[1],choices:3},{title:'정책의 효과 검증',sentences:6,answers:[2],choices:3},{title:'조사 결과를 어떻게 읽을까',sentences:13,answers:[0,1,2],choices:3}]
};
export const expertKey=(s,id=s.expertActive??0)=>`${s.courseDirection}:expert:${id}`;
const fresh=()=>({phase:'intro',index:0,sentence:0,selected:null,retry:false,checked:false,attempts:0,started:false,completed:false,solved:[]});
export function expertProgress(s,id=s.expertActive??0){
 const saved=s.experts?.[expertKey(s,id)];if(saved)return saved;
 const p=fresh(),ja=s.courseDirection==='ko-ja';
 const old=id===3?s.scenarios?.[`${s.courseDirection}:scenario:5`]:ja?s.readings?.[7]:s.korean?.lessons?.['7-1'];
 if(!old)return p;
 p.completed=Boolean(old.completed);if(p.completed){p.phase='done';return p;}
 const legacyIndex=id===3?0:ja?id*2:id;
 if(old.started&&(id===3||old.index===legacyIndex||ja&&old.index===legacyIndex+1)){
  p.started=true;
  if(id===3){p.solved=Array.from({length:old.index+(old.checked?1:0)},(_,i)=>i);}
  else if(ja)p.solved=(old.solved||[]).filter(i=>i>=id*2&&i<id*2+2).map(i=>i-id*2);
  p.index=Math.min(p.solved.length,expertCatalog[s.courseDirection][id].answers.length-1);
  p.resumePhase=p.solved.length===expertCatalog[s.courseDirection][id].answers.length?'review':'read';
  p.phase='intro';
 }
 return p;
}
export function validExperts(s){
 if(s.expertActive!==undefined&&(!Number.isInteger(s.expertActive)||s.expertActive<0||s.expertActive>3))return false;
 if(s.experts===undefined)return true;
 return Boolean(s.experts&&typeof s.experts==='object'&&!Array.isArray(s.experts)&&Object.entries(s.experts).every(([key,p])=>{
  const m=key.match(/^(ko-ja|ja-ko):expert:([0-3])$/);if(!m)return false;const c=expertCatalog[m[1]][Number(m[2])];
  return p&&(p.resumePhase===undefined||p.phase==='intro'&&['read','review'].includes(p.resumePhase))&&['intro','read','quiz','review','done'].includes(p.phase)&&Number.isInteger(p.index)&&p.index>=0&&p.index<c.answers.length&&Number.isInteger(p.sentence)&&p.sentence>=0&&p.sentence<c.sentences&&[null,...Array.from({length:c.choices},(_,i)=>i)].includes(p.selected)&&['retry','checked','started','completed'].every(k=>typeof p[k]==='boolean')&&Number.isSafeInteger(p.attempts)&&p.attempts>=0&&Array.isArray(p.solved)&&new Set(p.solved).size===p.solved.length&&p.solved.every(i=>Number.isInteger(i)&&i>=0&&i<c.answers.length)&&(!['review','done'].includes(p.phase)||p.completed||p.solved.length===c.answers.length)&&(p.phase!=='done'||p.completed);
 }));
}
export function reduceExpert(s,a){
 if(s.onboardingLevel!==7)return s;
 const id=a.type==='expert-start'?Number(a.id):s.expertActive,c=expertCatalog[s.courseDirection]?.[id];if(!c)return s;
 const p=structuredClone(expertProgress(s,id));
 if(a.type==='expert-start'){if(a.restart||p.phase==='done'){delete p.resumePhase;Object.assign(p,fresh(),{completed:p.completed});}p.started=true;}
 else if(!p.started)return s;
 else if(a.type==='expert-select'&&p.phase==='quiz'&&!p.checked&&Number.isInteger(Number(a.id))&&Number(a.id)>=0&&Number(a.id)<c.choices){p.selected=Number(a.id);p.retry=false;}
 else if(a.type==='expert-check'&&p.phase==='quiz'&&p.selected!==null&&!p.checked){p.attempts++;p.checked=p.selected===c.answers[p.index];p.retry=!p.checked;if(p.checked)p.solved=[...new Set([...p.solved,p.index])];}
 else if(a.type==='expert-next'){
  if(p.phase==='intro'){p.phase=p.resumePhase||'read';delete p.resumePhase;}
  else if(p.phase==='read')p.phase='quiz';
  else if(p.phase==='quiz'&&p.checked){if(p.index+1<c.answers.length)p.index++;else p.phase='review';p.checked=false;p.selected=null;p.retry=false;}
  else if(p.phase==='review'){if(p.sentence+1<c.sentences)p.sentence++;else{p.phase='done';p.completed=true;}}
  else return s;
 }else if(a.type==='expert-previous'){
  if(p.phase==='read')p.phase='intro';else if(p.phase==='quiz'){p.phase='read';p.selected=null;p.checked=false;p.retry=false;}else if(p.phase==='review'&&p.sentence>0)p.sentence--;else return s;
 }else return s;
 return {...s,expertActive:id,experts:{...s.experts,[expertKey(s,id)]:p}};
}
export function expertPercent(s){const p=expertProgress(s),c=expertCatalog[s.courseDirection][s.expertActive??0];if(p.phase==='done')return 100;const done=p.phase==='intro'?0:p.phase==='read'?1:p.phase==='quiz'?2+p.index:2+c.answers.length+p.sentence;return Math.floor(done/(2+c.answers.length+c.sentences)*100);}
