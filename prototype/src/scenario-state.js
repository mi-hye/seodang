// Only the small catalogue and progress model load with the map. Copy/audio load on entry.
export const scenarioLessons=[
 {id:'2',level:2,titles:['식당에서 자리를 부탁해요','お店で席をお願いする'],count:3,number:{'ko-ja':5,'ja-ko':5}},
 {id:'3',level:4,titles:['숙소에서 체크인해요','宿でチェックインする'],count:3,number:{'ko-ja':2,'ja-ko':2}},
 {id:'4',level:5,titles:['바뀐 배송 안내를 확인해요','配送の変更を確かめる'],count:3,number:{'ko-ja':3,'ja-ko':3}},
 {id:'5',level:7,titles:['調査結果をどう読むか','조사 결과를 어떻게 읽을까'],count:3,number:{'ko-ja':2,'ja-ko':2}}
];
export const scenarioKey=(s,id=s.scenarioActive)=>`${s.courseDirection}:scenario:${id}`;
export const scenarioProgress=(s,id=s.scenarioActive)=>s.scenarios?.[scenarioKey(s,id)]||{version:1,started:false,phase:'intro',index:0,selected:null,tokens:[],checked:false,retry:false,completed:false,attempts:0};
export const scenarioTitle=(s,l)=>l.titles[s.courseDirection==='ja-ko'?1:0];
export function validScenarios(s){
 return (s.scenarioActive===undefined||s.scenarioActive==='1'||scenarioLessons.some(l=>l.id===s.scenarioActive))&&(s.scenarios===undefined||Boolean(s.scenarios&&typeof s.scenarios==='object'&&!Array.isArray(s.scenarios)&&Object.entries(s.scenarios).every(([key,p])=>/^(ko-ja|ja-ko):scenario:[1-5]$/.test(key)&&p?.version===1&&(['intro','learn','quiz','done'].includes(p.phase)||key.endsWith(':2')&&p.phase==='speak')&&Number.isInteger(p.index)&&p.index>=0&&p.index<3&&[null,0,1,2].includes(p.selected)&&Array.isArray(p.tokens)&&p.tokens.every(x=>[0,1,2].includes(x))&&new Set(p.tokens).size===p.tokens.length&&['started','checked','retry','completed'].every(k=>typeof p[k]==='boolean')&&Number.isInteger(p.attempts)&&p.attempts>=0&&(p.phase!=='done'||p.completed))));
}
export function reduceScenario(s,a){
 const id=a.type==='scenario-start'?String(a.id):s.scenarioActive,l=scenarioLessons.find(l=>l.id===id);if(!l||l.level!==(s.onboardingLevel===6?5:s.onboardingLevel))return s;
 const key=scenarioKey(s,id),old=scenarioProgress(s,id),p=structuredClone(old);
 if(a.type==='scenario-start'){p.started=true;if(p.phase==='done'){Object.assign(p,{phase:'intro',index:0,selected:null,tokens:[],checked:false,retry:false});}}
 else if(!p.started)return s;
 else if(a.type==='scenario-next'){
  if(p.phase==='intro')p.phase='learn';
  else if(p.phase==='learn')p.phase='quiz';
  else if(p.phase==='quiz'&&p.checked){if(id==='2')p.phase='speak';else if(p.index===2){p.phase='done';p.completed=true;}else{p.index++;p.phase='learn';}}
  else return s;
  p.selected=null;p.tokens=[];p.checked=false;p.retry=false;
 }else if(a.type==='scenario-speak-next'&&id==='2'&&p.phase==='speak'){if(p.index===2){p.phase='done';p.completed=true;}else{p.index++;p.phase='learn';}
 }else if(a.type==='scenario-previous'){
  if(p.phase==='speak')p.phase='quiz';else if(p.phase==='quiz')p.phase='learn';else if(p.phase==='learn'){if(p.index>0)p.index--;else p.phase='intro';}else return s;
  p.selected=null;p.tokens=[];p.checked=false;p.retry=false;
 }else if(a.type==='scenario-select'&&p.phase==='quiz'&&!p.checked&&[0,1,2].includes(Number(a.id))){p.selected=Number(a.id);p.retry=false;}
 else if(a.type==='scenario-token'&&id==='2'&&p.phase==='quiz'&&!p.checked&&[0,1,2].includes(Number(a.id))){const n=Number(a.id);p.tokens=p.tokens.includes(n)?p.tokens.filter(x=>x!==n):[...p.tokens,n];p.retry=false;}
 else if(a.type==='scenario-clear'&&p.phase==='quiz'&&!p.checked){p.tokens=[];p.retry=false;}
 else if(a.type==='scenario-check'&&p.phase==='quiz'&&!p.checked&&(id==='2'?p.tokens.length===3:p.selected!==null)){p.attempts++;p.checked=id==='2'?p.tokens.every((x,i)=>x===i):p.selected===p.index;p.retry=!p.checked;}
 else return s;
 return {...s,scenarioActive:id,scenarios:{...s.scenarios,[key]:p}};
}
