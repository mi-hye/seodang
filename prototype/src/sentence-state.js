// Keep the first lesson in its original save slot; new lessons have independent progress.
export const sentenceLessons=[{id:3,title:'교류회에서 자기소개하기'},{id:0,title:'카페에 남겨진 가방'},{id:1,title:'편의점에서 물건 사기'},{id:2,title:'역에서 친구 만나기'}];
export const sentenceId=s=>s.sentenceActive??0;
export const nextSentence=s=>{const active=sentenceId(s);return sentenceProgress(s,active).started&&!sentenceProgress(s,active).completed?active:sentenceLessons.find(l=>!sentenceProgress(s,l.id).completed)?.id??2;};
export const freshSentence = () => ({version:1, started:false, phase:'intro', index:0, learned:[], tokens:[], checked:false, selected:null, feedback:'', completed:false, attempts:0});
export const sentenceProgress = (state,id=sentenceId(state)) => (id===0?state.sentence:state.sentenceLessons?.[id]) || freshSentence();
export function setSentenceProgress(state,id,progress){if(id===0)state.sentence=progress;else{state.sentenceLessons||={};state.sentenceLessons[id]=progress;}}
export const validSentenceCourses=s=>(s.sentenceActive===undefined||[0,1,2,3].includes(s.sentenceActive))&&(s.sentenceLessons===undefined||Boolean(s.sentenceLessons&&typeof s.sentenceLessons==='object'&&!Array.isArray(s.sentenceLessons)&&Object.entries(s.sentenceLessons).every(([id,p])=>['1','2','3'].includes(id)&&validSentence(p,Number(id)))));
const phases = ['intro','learn','arrange','solve','summary'];
const tokenCounts = [3,3,2];
export function validSentence(s,id=0) {
  const counts=id===3?[2,3,2,2,2,2]:id===1?[3,3,3]:tokenCounts;
  return s?.version === 1 && phases.includes(s.phase) && Number.isInteger(s.index) && s.index >= 0 && s.index < counts.length &&
    ['started','checked','completed'].every(k=>typeof s[k] === 'boolean') && typeof s.feedback === 'string' &&
    Number.isInteger(s.attempts) && s.attempts >= 0 && [null,...(id===0?['window-red','door-blue','window-blue']:['0','1','2'])].includes(s.selected) &&
    Array.isArray(s.learned) && s.learned.every(i=>Number.isInteger(i)&&i>=0&&i<counts.length) && new Set(s.learned).size===s.learned.length &&
    Array.isArray(s.tokens) && s.tokens.every(i=>Number.isInteger(i)&&i>=0&&i<counts[s.index]) && new Set(s.tokens).size===s.tokens.length;
}
export function reduceSentence(progress, action,id=0) {
  const counts=id===3?[2,3,2,2,2,2]:id===1?[3,3,3]:tokenCounts;
  const s=structuredClone(progress || freshSentence());
  const clear=()=>{s.tokens=[];s.checked=false;s.feedback='';};
  if(id===3&&s.phase==='solve'){s.phase='arrange';s.index=5;s.selected=null;s.tokens=[];s.checked=false;}
  if(action.type==='sentence-start'){if(s.phase==='summary')return {...freshSentence(),started:true,learned:s.learned,completed:s.completed};s.started=true;}
  if(action.type==='sentence-restart') return {...freshSentence(),started:true,learned:s.learned,completed:s.completed};
  if(action.type==='sentence-next') {
    if(s.phase==='intro') s.phase='learn';
    else if(s.phase==='learn') {s.phase='arrange';clear();}
    else if(s.phase==='arrange' && s.checked) {
      s.learned=[...new Set([...s.learned,s.index])];
      if(s.index<counts.length-1) {s.index++;s.phase='learn';} else s.phase='solve';
      clear();
    }
  }
  if(action.type==='sentence-previous') {
    if(s.phase==='learn' && s.index===0) s.phase='intro';
    else if(s.phase==='learn') {s.index--;s.phase='learn';}
    else if(s.phase==='arrange') s.phase='learn';
    else if(s.phase==='solve') {s.index=counts.length-1;s.phase='learn';}
    clear();
  }
  if(id===3&&s.phase==='arrange'){
    if(action.type==='sentence-select'&&['0','1','2'].includes(action.id)){s.selected=action.id;s.feedback='';}
    if(action.type==='sentence-check'&&s.selected!==null){
      s.attempts++;
      if(Number(s.selected)!==s.index%3)s.feedback='다시 골라 주세요.';
      else{s.learned=[...new Set([...s.learned,s.index])];if(s.index<counts.length-1){s.index++;s.phase='learn';}else{s.completed=true;s.phase='summary';}s.selected=null;clear();}
    }
    return s;
  }
  if(action.type==='sentence-token' && s.phase==='arrange' && !s.checked) {
    const n=Number(action.id);
    if(Number.isInteger(n)&&n>=0&&n<counts[s.index]) {
      s.tokens=s.tokens.includes(n)?s.tokens.filter(i=>i!==n):[...s.tokens,n];s.feedback='';
    }
  }
  if(action.type==='sentence-clear' && s.phase==='arrange' && !s.checked) clear();
  if(action.type==='sentence-check' && s.phase==='arrange' && !s.checked) {
    if(s.tokens.length!==counts[s.index]) s.feedback='모든 말을 골라 문장을 완성해 주세요.';
    else {
      s.attempts++;
      s.checked=s.tokens.every((n,i)=>n===i);
      s.feedback=s.checked?'':id!==0?'문장에 나온 말의 순서를 다시 확인해 주세요.':['これは → わたしの → かばんです。 순서예요.','かばんは → まどの そばに → あります。 순서예요.','あかい かばんでは → ありません。 순서예요.'][s.index];
    }
  }
  if(action.type==='sentence-select' && s.phase==='solve' && (id===0?['window-red','door-blue','window-blue']:['0','1','2']).includes(action.id)) {s.selected=action.id;s.feedback='';}
  if(action.type==='sentence-submit' && s.phase==='solve') {
    if(!s.selected) s.feedback=id===0?'가방을 먼저 골라 주세요.':'답을 먼저 골라 주세요.';
    else {
      s.attempts++;
      if(s.selected===(id===0?'window-blue':id===1?'1':'2')) {s.completed=true;s.phase='summary';s.feedback='';}
      else s.feedback=id===3?'한국 사람이라고 소개한 문장을 떠올려 보세요.':id!==0?'필요한 수량이나 약속 장소와 시각을 다시 확인해 주세요.':s.selected==='window-red'?'ありません은 아니라는 뜻이에요. 빨간 가방은 제외해요.':'まどの そば는 창문 옆이에요. 위치를 확인해 주세요.';
    }
  }
  return s;
}
