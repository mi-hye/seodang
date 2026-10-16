import { parcelWords } from './parcel-words.js';
const groups = [
  ['あいうえお', 'a i u e o', '아 이 우 에 오'],
  ['かきくけこ', 'ka ki ku ke ko', '카 키 쿠 케 코'],
  ['さしすせそ', 'sa shi su se so', '사 시 스 세 소'],
  ['たちつてと', 'ta chi tsu te to', '타 치 츠 테 토'],
  ['なにぬねの', 'na ni nu ne no', '나 니 누 네 노'],
  ['はひふへほ', 'ha hi fu he ho', '하 히 후 헤 호'],
  ['まみむめも', 'ma mi mu me mo', '마 미 무 메 모'],
  ['やゆよ', 'ya yu yo', '야 유 요'],
  ['らりるれろ', 'ra ri ru re ro', '라 리 루 레 로'],
  ['わをん', 'wa wo n', '와 오 응'],
];
export const legacyKanaGroups = groups.map(([title, ids, readings]) => ({
  title, letters: [...title].map((text, i) => ({ id: ids.split(' ')[i], text, reading: readings.split(' ')[i] })),
}));
const definitions = [
  { caseTitle: '사라진 우산', groups: [0,1,2], image: 'assets/kana-case-umbrella-v1.png', imageAlt: '카페 입구의 우산 보관함 일러스트' },
  { caseTitle: '바뀐 배달 상자', groups: [3,4,5], image: 'assets/kana-case-parcel-v1.png', imageAlt: '카페에 도착한 세 배달 상자 일러스트' },
  { caseTitle: '마지막 보관 봉투', groups: [6,7,8,9], image: 'assets/kana-case-envelope-v1.png', imageAlt: '카페 보관함의 세 봉투 일러스트' },
];
export const legacyKanaLessons = definitions.map((definition, index) => {
  const letters = definition.groups.flatMap(i => legacyKanaGroups[i].letters);
  return { ...definition, id: index, letters, title: letters.map(l => l.text).join(''), rangeLabel: `${letters[0].text}〜${letters.at(-1).text} · ${letters.length}글자` };
});
// First success uses a real name. The other two chapters retain all remaining letters.
export const previousKanaLessons = [
 {...legacyKanaLessons[0],caseTitle:'이름표 글자 연습',image:'assets/word-blue-bag-v1.png',imageAlt:'이름표로 찾아줄 파란 가방',letters:['a','o','i'].map(id=>legacyKanaLessons[0].letters.find(l=>l.id===id))},
 {...legacyKanaLessons[1],letters:[...legacyKanaLessons[0].letters.filter(l=>!['a','o','i'].includes(l.id)),...legacyKanaLessons[1].letters]},
 {...legacyKanaLessons[2]},
].map(l=>({...l,title:l.letters.map(x=>x.text).join(''),rangeLabel:`${l.letters.length}글자 · 조금씩 배우기`}));
const parcelIds=parcelWords.flatMap(w=>w.ids);
const allLetters=legacyKanaGroups.flatMap(g=>g.letters);
export const versionSixLessons = [
 previousKanaLessons[0],
 {...previousKanaLessons[1],letters:parcelIds.map(id=>allLetters.find(l=>l.id===id))},
 {...previousKanaLessons[2],letters:allLetters.filter(l=>!['a','o','i',...parcelIds].includes(l.id))},
].map(l=>({...l,title:l.letters.map(x=>x.text).join(''),rangeLabel:`${l.letters.length}글자 · 조금씩 배우기`}));
export const versionSevenLessons=versionSixLessons.map((l,i)=>i===0?{...l,letters:[...l.letters,allLetters.find(x=>x.id==='ki')],title:'あおい・あき・あい'}:l);
export const kanaLessons = Array.from({length:5},(_,i)=>{
 const letters=allLetters.slice(i*10,(i+1)*10),split=letters.length===6?3:5;
 return {id:i,caseTitle:`히라가나 ${letters[0].text}-${letters.at(-1).text}`,title:letters.map(l=>l.text).join(''),letters,rounds:[letters.slice(0,split),letters.slice(split)].filter(r=>r.length),rangeLabel:`${letters[0].text}〜${letters.at(-1).text} · ${letters.length}자`};
});
export function kanaRound(lesson,index=0){
 let start=0;
 const rounds=lesson.rounds||lesson.groups.map(group=>legacyKanaGroups[group].letters);
 for(const [number,letters] of rounds.entries()){
  const end=start+letters.length;
  if(index<end)return {start,end,letters,number:number+1,total:rounds.length};
  start=end;
 }
}
export const kanaLetters = allLetters;
const freshLesson = () => ({ started: false, phase: 'intro', index: 0, answered: false, feedback: '', completed: false, caseSolved: false, matches: [] });
export const freshKana = () => ({ version: 9, active: 0, lessons: kanaLessons.map(freshLesson), learned: [] });
export const selectedLevel = state => state.onboardingLevel ?? (state.onboarded ? 2 : 0);
export function normalizeKana(previous){
 if(!previous)return freshKana();
 if(previous.version===9){
  const k=structuredClone(previous);
  k.lessons.forEach((l,i)=>{
   if(l.matches===undefined){
    const r=kanaRound(kanaLessons[i],l.index);
    l.matches=l.phase==='quiz'?kanaLessons[i].letters.slice(r.start,l.index+Number(l.answered)).map(x=>x.id):[];
    if(l.phase==='quiz'){l.index=r.start;l.answered=l.matches.length===r.letters.length;}
   }
  });
  return k;
 }
 const k=freshKana();
 // Archive the old arrangement and retain completion only when every glyph was completed.
 if(previous.version===8){
  if(previous.practiceAccess)k.practiceAccess=true;
  const completed=new Set(legacyKanaLessons.flatMap((lesson,i)=>previous.lessons[i].completed?lesson.letters.map(l=>l.id):[]));
  k.lessons=k.lessons.map((p,i)=>kanaLessons[i].letters.every(l=>completed.has(l.id))?{...p,started:true,phase:'summary',completed:true,caseSolved:true}:p);
  k.active=Math.max(0,k.lessons.findIndex(l=>!l.completed));
 }
 k.previousCourse=structuredClone(previous);
 k.learned=[...previous.learned];
 return k;
}
export const kanaSolvedCount = previous => normalizeKana(previous).lessons.filter(l => l.caseSolved).length;
export const kanaCompletedCount = previous => normalizeKana(previous).lessons.filter(l => l.completed).length;
export const kanaUnlocked = (k, index) => Number.isInteger(index) && index >= 0 && index < kanaLessons.length;
function validLesson(l, length, version = 2) {
  return l && typeof l.started === 'boolean' && (version >= 8 ? ['intro','learn','reading','quiz','summary'] : version >= 4 ? ['preview','intro','learn','quiz','solve','summary',...(version>=7?['reading']:[])] : version === 3 ? ['intro','learn','quiz','solve','summary'] : ['learn','quiz','summary']).includes(l.phase)
    && Number.isInteger(l.index) && l.index >= 0 && l.index < length
    && typeof l.answered === 'boolean' && typeof l.feedback === 'string' && (l.storyRound===undefined || (Number.isInteger(l.storyRound)&&l.storyRound>=0&&l.storyRound<=2)) && (l.help===undefined || typeof l.help==='boolean')
    && typeof l.completed === 'boolean' && (l.phase !== 'summary' || l.completed)
    && (version < 3 || (typeof l.caseSolved === 'boolean' && (!l.caseSolved || l.completed) && (l.phase !== 'summary' || l.caseSolved)));
}
export function validKana(k) {
  if (!k || !Array.isArray(k.learned) || new Set(k.learned).size !== k.learned.length) return false;
  if (k.version === undefined) return validLesson(k, 5) && k.learned.every(id => legacyKanaGroups[0].letters.some(l => l.id === id));
  if (![2,3,4,5,6,7,8,9].includes(k.version)) return false;
  const lessons = k.version === 9 ? kanaLessons : k.version === 8 ? legacyKanaLessons : k.version === 7 ? versionSevenLessons : k.version === 6 ? versionSixLessons : k.version === 5 ? previousKanaLessons : k.version === 4 ? legacyKanaLessons : legacyKanaGroups;
  const unlocked = i => Number.isInteger(i) && i >= 0 && i < lessons.length && k.lessons.slice(0,i).every(l => l.completed);
  return Array.isArray(k.lessons) && k.lessons.length === lessons.length
    && k.lessons.every((l, i) => validLesson(l, lessons[i].letters.length, k.version))
    && (k.practiceAccess===undefined || typeof k.practiceAccess==='boolean')
    && Number.isInteger(k.active) && k.active>=0 && k.active<lessons.length
    && (k.version===9 || (k.version>=8 && k.practiceAccess) || (unlocked(k.active) && k.lessons.every((l, i) => (!l.started && !l.completed) || unlocked(i))))
    && k.learned.every(id => kanaLetters.some(l => l.id === id))
    && (k.version<8 || k.lessons.every((l,i)=>l.matches===undefined || (Array.isArray(l.matches)&&new Set(l.matches).size===l.matches.length&&l.matches.every(id=>kanaRound(lessons[i],l.index).letters.some(x=>x.id===id))&&(l.phase!=='quiz'||l.answered===(l.matches.length===kanaRound(lessons[i],l.index).letters.length)))));
}
export function reduceKana(previous, action) {
 const k=normalizeKana(previous);
 if(['kana-start','kana-continue'].includes(action.type)){
  let next=action.lesson??k.active;
  if(action.lesson===undefined&&k.lessons[next].phase==='summary'){
   next=k.lessons.findIndex(l=>!l.completed);if(next<0)next=0;
  }
  if(!kanaUnlocked(k,next))return k;
  k.active=next;
  if(k.lessons[next].phase==='summary')k.lessons[next]={...freshLesson(),completed:true,caseSolved:true};
  k.lessons[next].started=true;
 }
 let l=k.lessons[k.active];
 if(action.type==='kana-restart'){
  k.lessons[k.active]={...freshLesson(),started:true,completed:l.completed,caseSolved:l.caseSolved};return k;
 }
 const letters=kanaLessons[k.active].letters,round=kanaRound(kanaLessons[k.active],l.index);
 if(action.type==='kana-help'&&l.phase==='quiz'&&!l.answered){l.phase='reading';l.index=round.start;l.feedback='';}
 if(action.type==='kana-match'&&l.phase==='quiz'&&!l.answered){
  const valid=id=>round.letters.some(x=>x.id===id)&&!l.matches.includes(id);
  if(!valid(action.left)||!valid(action.right))return k;
  if(action.left===action.right){l.matches.push(action.left);l.answered=l.matches.length===round.letters.length;l.feedback=l.answered?'모든 글자와 발음을 이었어요.':'잘 이었어요. 남은 짝도 이어 봐요.';}
  else l.feedback='다른 발음이에요. 다시 이어 봐요.';
 }
 if(action.type==='kana-previous'&&['learn','reading'].includes(l.phase)&&l.index>round.start){l.index--;l.answered=false;l.feedback='';}
 if(action.type==='kana-quiz-restart'&&l.phase==='quiz'){l.index=round.start;l.matches=[];l.answered=false;l.feedback='';}
 if(action.type==='kana-next'){
  if(l.phase==='summary'||(l.phase==='quiz'&&!l.answered))return k;
  if(l.phase==='intro')l.phase='learn';
  else if(l.phase==='learn'){
   k.learned=[...new Set([...k.learned,letters[l.index].id])];
   if(l.index<round.end-1)l.index++;else {l.phase='reading';l.index=round.start;}
  } else if(l.phase==='reading'){
   if(l.index<round.end-1)l.index++;else {l.phase='quiz';l.index=round.start;}
  } else if(l.phase==='quiz'){
   if(round.end<letters.length){l.phase='intro';l.index=round.end;}
   else {l.phase='summary';l.completed=true;l.caseSolved=true;}
  }
  if(l.phase==='intro'||l.phase==='summary')l.matches=[];
  l.answered=l.phase==='quiz'&&l.matches.length===round.letters.length;l.feedback='';
 }
 return k;
}
