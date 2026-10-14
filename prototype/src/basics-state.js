import {normalizeKana} from './kana-state.js';
import {developmentMode} from './build-config.js';
export const basicLevel=id=>Number(id)===6?1:0;
export const basicLessons=[{id:6,title:'새 단어 읽기',count:6},{id:7,title:'탁음',count:6},{id:8,title:'반탁음',count:5},{id:9,title:'작은 っ 단어',count:6},{id:10,title:'きゃ・しゅ와 단어',count:12}];
export const freshBasic=(id)=>({started:false,index:0,phase:[7,8,9,10].includes(id)?'intro':'learn',selected:null,retry:false,completed:false});
export const basicProgress=(s,id)=>s.basics?.lessons?.[id]||freshBasic(id);
export const basicUnlocked=(s,id)=>basicLessons.some(l=>l.id===id)&&(developmentMode||(id===6?Boolean(s.listening?.completed):id===7?normalizeKana(s.kana).lessons.every(l=>l.completed):basicProgress(s,id-1).completed));
export const nextBasic=s=>{const active=s.basics?.active;if(active&&basicLevel(active)===(s.onboardingLevel??0)&&basicUnlocked(s,active)&&!basicProgress(s,active).completed)return active;return basicLessons.find(l=>basicLevel(l.id)===(s.onboardingLevel??0)&&basicUnlocked(s,l.id)&&!basicProgress(s,l.id).completed)?.id||(s.onboardingLevel===1?6:10);};
export function validBasics(b){return b===undefined||Boolean(b&&[1,2,3,4,5,6,7].includes(b.version)&&basicLessons.some(l=>l.id===b.active)&&b.lessons&&typeof b.lessons==='object'&&!Array.isArray(b.lessons)&&Object.entries(b.lessons).every(([id,p])=>{const l=basicLessons.find(l=>l.id===Number(id));return l&&p&&['started','retry','completed'].every(k=>typeof p[k]==='boolean')&&Number.isInteger(p.index)&&p.index>=0&&p.index<(b.version===1?oldBasicIndices[l.id].length:b.version===2&&l.id===7?9:b.version===3&&l.id===7?8:b.version<=5&&l.id===8?8:l.count)&&['intro','learn','write','quiz','done'].includes(p.phase)&&(p.selected===null||((l.id===7&&b.version>=5||l.id===8&&b.version>=6)?[0,1,2,3]:[0,1,2]).includes(p.selected))&&(p.phase!=='done'||p.completed);}));}
const oldBasicIndices={6:[0,1,2,3,4,5],7:[0,1,3,4,6,7],8:[0,1,3,5,6],9:[0,2,3,5],10:[0,2,4,6,8,10]};
function normalizeLegacyBasics(b){
 if(!b)return b;
 if(b.version>=5)return b;
 if(b.version===4){const next=structuredClone(b);next.version=5;if(next.lessons[7]){next.lessons[7].selected=null;next.lessons[7].retry=false;}return next;}
 const next=structuredClone(b);next.version=2;
 if(b.version===1)for(const [id,p] of Object.entries(next.lessons)){
  const mapped=oldBasicIndices[id][p.index];
  if(Number(id)===6)continue;
  if(p.completed){p.index=Number(id)===9?1:Number(id)===10?1:2;p.phase='learn';p.completed=false;p.started=true;}
  else p.index=mapped;
  // The answer slots rotate with the new index; do not retain a stale choice.
  p.selected=null;p.retry=false;
 }
 const p=next.lessons[7];
 if(p){const old=p.index,mapping=b.version===3?[0,1,2,3,4,4,5,5]:[0,1,2,2,3,4,4,5,5],removed=(b.version===3?[4,7]:[2,5,8]).includes(old);p.index=mapping[old];p.selected=null;p.retry=false;if(removed&&!p.completed)p.phase='learn';}
 next.version=5;
 return next;
}
export function normalizeBasics(b){
 if(!b||b.version===7)return b;
 const next=structuredClone(normalizeLegacyBasics(b)),p=next.lessons[8];
 if(p&&b.version<6){const old=p.index;p.index=[0,1,2,2,3,3,4,4][old];p.selected=null;p.retry=false;if([2,4,7].includes(old)&&!p.completed)p.phase='learn';}
 const lesson=next.lessons[10];if(lesson?.phase==='quiz'){lesson.index=Math.min(lesson.index+1,11);lesson.phase='learn';lesson.selected=null;lesson.retry=false;}
 next.version=7;return next;
}
export function reduceBasics(s,a){
 const b=structuredClone(normalizeBasics(s.basics)||{version:7,active:6,lessons:{}}),id=a.type==='basic-start'?Number(a.id):b.active,l=basicLessons.find(l=>l.id===id);
 if(!l||!basicUnlocked(s,id))return s.basics;
 if(a.type==='basic-start'){b.active=id;const old=b.lessons[id]||freshBasic(id);b.lessons[id]=old.phase==='done'?{...freshBasic(id),started:true,completed:old.completed}:{...old,started:true};return b;}
 const p=b.lessons[id];if(!p?.started)return b;
 if(a.type==='basic-next'&&p.phase==='intro'){p.phase='learn';return b;}
 if(a.type==='basic-next'&&id===10&&p.phase==='learn'){if(p.index+1<l.count)p.index++;else{p.phase='done';p.completed=true;}return b;}
 if(a.type==='basic-next'&&['learn','write'].includes(p.phase)){p.phase=[7,8].includes(id)&&p.phase==='learn'?'write':'quiz';p.selected=null;p.retry=false;}
 if(a.type==='basic-previous'){if(p.phase==='quiz')p.phase=[7,8].includes(id)?'write':'learn';else if(p.phase==='write')p.phase='learn';else if(p.index>0){p.index--;p.phase='learn';}else if(p.phase==='learn'&&[7,8,9,10].includes(id))p.phase='intro';p.selected=null;p.retry=false;}
 if(a.type==='basic-select'&&p.phase==='quiz'&&([7,8].includes(id)?['0','1','2','3']:['0','1','2']).includes(String(a.id))){p.selected=Number(a.id);p.retry=false;}
 if(a.type==='basic-check'&&p.phase==='quiz'&&p.selected!==null){
  // Choices rotate deterministically; the target occupies index % 3.
  if(p.selected===p.index%([7,8].includes(id)?4:3)){p.selected=null;p.retry=false;if(p.index+1<l.count){p.index++;p.phase='learn';}else{p.phase='done';p.completed=true;}}
  else p.retry=true;
 }
 return b;
}
