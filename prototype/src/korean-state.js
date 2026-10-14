import {developmentMode} from './build-config.js';
export const koreanLevels=['文字と音','単語','単語と短い表現','短い文','日常会話','文章の要点と意見','読んで考える','言外の意味を聞き取る'];
export const koreanLessons=[
 ...[['文字を学ぶ · 基本',10],['文字を使う · 基本',10],['文字を学ぶ · 子音と母音',14],['文字を使う · 子音と母音',14],['文字を学ぶ · 濃音',5],['文字を使う · 濃音',5],['文字を学ぶ · 複合母音',11],['文字を使う · 複合母音',11],['文字を学ぶ · パッチム',6],['文字を使う · パッチム',6]].map(([title,count],i)=>({id:`1-${i+1}`,level:0,title,count,practice:i%2===1})),
 {id:'1-11',level:1,title:'身近な単語',count:6},
 {id:'2-1',level:2,title:'お店で使う言葉',count:6},{id:'3-1',level:3,title:'自分のことを伝える',count:6},{id:'4-1',level:4,title:'カフェで注文する',count:6},{id:'5-1',level:5,title:'案内と意見を読む',count:3},{id:'6-1',level:6,title:'条件と理由を読み解く',count:3},{id:'7-1',level:7,title:'本音と論理を聞き取る',count:3}
];
export const freshKoreanProgress=()=>({index:0,phase:'learn',selected:null,retry:false,started:false,completed:false});
export const koreanProgress=(s,id)=>s.korean?.lessons?.[id]||freshKoreanProgress();
export const koreanUnlocked=(s,id)=>{const l=koreanLessons.find(l=>l.id===id);return Boolean(l&&(developmentMode||l.level>=1||id==='1-1'||koreanProgress(s,`1-${Number(id.split('-')[1])-1}`).completed));};
export function nextKorean(s){const lessons=koreanLessons.filter(l=>l.level===(s.onboardingLevel??0));return lessons.find(l=>l.id===s.korean?.active&&koreanUnlocked(s,l.id)&&!koreanProgress(s,l.id).completed)||lessons.find(l=>koreanUnlocked(s,l.id)&&!koreanProgress(s,l.id).completed)||lessons.at(-1);}
export function validKorean(k){return k===undefined||Boolean([1,2].includes(k?.version)&&koreanLessons.some(l=>l.id===k.active)&&k.lessons&&typeof k.lessons==='object'&&!Array.isArray(k.lessons)&&Object.entries(k.lessons).every(([id,p])=>{const l=koreanLessons.find(l=>l.id===id);return l&&p&&Number.isInteger(p.index)&&p.index>=0&&p.index<(k.version===1&&l.level===0?[6,4,7,7,5,11,6,6,6,4][Number(id.split('-')[1])-1]:l.count)&&['learn','quiz','done'].includes(p.phase)&&[null,0,1,2].includes(p.selected)&&['retry','started','completed'].every(f=>typeof p[f]==='boolean')&&(p.phase!=='done'||p.completed);})&&(!k.history||(k.history.version===1&&/^\d{4}-\d{2}-\d{2}$/.test(k.history.startedOn)&&k.history.days&&typeof k.history.days==='object'&&!Array.isArray(k.history.days)&&Object.entries(k.history.days).every(([day,p])=>/^\d{4}-\d{2}-\d{2}$/.test(day)&&['letters','expressions','sentences','cases'].every(f=>Number.isSafeInteger(p[f])&&p[f]>=0)))));}
export function normalizeKorean(k){
 if(!k||k.version===2)return k;
 // Keep the old course and its records; new activities must not inherit unrelated answers.
 const lessons=Object.fromEntries(Object.entries(k.lessons).filter(([id])=>!id.startsWith('1-')));
 return {...k,version:2,legacyLetters:structuredClone(k.lessons),lessons,active:k.active.startsWith('1-')?'1-1':k.active};
}
export const koreanQuizOnly=l=>Boolean(l.practice||l.level>=5);
export function reduceKorean(s,a,now=new Date()){
 const k=structuredClone(normalizeKorean(s.korean)||{version:2,active:'1-1',lessons:{}}),id=a.type==='korean-start'?a.id:k.active,l=koreanLessons.find(l=>l.id===id);
 if(!l||!koreanUnlocked(s,id))return s.korean;
 if(a.type==='korean-start'){k.active=id;const old=k.lessons[id]||freshKoreanProgress();k.lessons[id]=old.phase==='done'?{...freshKoreanProgress(),started:true,completed:true,phase:koreanQuizOnly(l)?'quiz':'learn'}:{...old,started:true};if(koreanQuizOnly(l))k.lessons[id].phase='quiz';return k;}
 const p=k.lessons[id];if(!p?.started)return s.korean;
 if(a.type==='korean-next'&&p.phase==='learn'){p.phase='quiz';p.selected=null;p.retry=false;}
 if(a.type==='korean-previous'){if(p.phase==='quiz'&&!koreanQuizOnly(l))p.phase='learn';else if(p.index>0){p.index--;p.phase=koreanQuizOnly(l)?'quiz':'learn';}p.selected=null;p.retry=false;}
 if(a.type==='korean-select'&&p.phase==='quiz'&&[0,1,2].includes(Number(a.id))){p.selected=l.practice&&p.selected===Number(a.id)?null:Number(a.id);p.retry=false;}
 if(a.type==='korean-check'&&p.phase==='quiz'&&p.selected!==null){
  if(p.selected!==p.index%3){p.retry=true;return k;}
  const day=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const h=k.history||={version:1,startedOn:day,days:{}},d=h.days[day]||={letters:0,expressions:0,sentences:0,cases:0};
  d[l.level===0?'letters':l.level<=2?'expressions':'sentences']++;
  p.selected=null;p.retry=false;
  if(p.index+1<l.count){p.index++;p.phase=koreanQuizOnly(l)?'quiz':'learn';}else{if(!p.completed)d.cases++;p.completed=true;p.phase='done';}
 }
 return k;
}
