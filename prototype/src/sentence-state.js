// Separate progress for level 3; old level 1/2 saves need no migration.
export const freshSentence = () => ({version:1, started:false, phase:'intro', index:0, learned:[], tokens:[], checked:false, selected:null, feedback:'', completed:false, attempts:0});
export const sentenceProgress = state => state.sentence || freshSentence();
const phases = ['intro','learn','arrange','solve','summary'];
const tokenCounts = [3,3,2];
export function validSentence(s) {
  return s?.version === 1 && phases.includes(s.phase) && Number.isInteger(s.index) && s.index >= 0 && s.index < 3 &&
    ['started','checked','completed'].every(k=>typeof s[k] === 'boolean') && typeof s.feedback === 'string' &&
    Number.isInteger(s.attempts) && s.attempts >= 0 && [null,'window-red','door-blue','window-blue'].includes(s.selected) &&
    Array.isArray(s.learned) && s.learned.every(i=>Number.isInteger(i)&&i>=0&&i<3) && new Set(s.learned).size===s.learned.length &&
    Array.isArray(s.tokens) && s.tokens.every(i=>Number.isInteger(i)&&i>=0&&i<tokenCounts[s.index]) && new Set(s.tokens).size===s.tokens.length;
}
export function reduceSentence(progress, action) {
  const s=structuredClone(progress || freshSentence());
  const clear=()=>{s.tokens=[];s.checked=false;s.feedback='';};
  if(action.type==='sentence-start') s.started=true;
  if(action.type==='sentence-restart') return {...freshSentence(),started:true,learned:s.learned,completed:s.completed};
  if(action.type==='sentence-next') {
    if(s.phase==='intro') s.phase='learn';
    else if(s.phase==='learn') {s.phase='arrange';clear();}
    else if(s.phase==='arrange' && s.checked) {
      s.learned=[...new Set([...s.learned,s.index])];
      if(s.index<2) {s.index++;s.phase='learn';} else s.phase='solve';
      clear();
    }
  }
  if(action.type==='sentence-previous') {
    if(s.phase==='learn' && s.index===0) s.phase='intro';
    else if(s.phase==='learn') {s.index--;s.phase='learn';}
    else if(s.phase==='arrange') s.phase='learn';
    else if(s.phase==='solve') {s.index=2;s.phase='learn';}
    clear();
  }
  if(action.type==='sentence-token' && s.phase==='arrange' && !s.checked) {
    const n=Number(action.id);
    if(Number.isInteger(n)&&n>=0&&n<tokenCounts[s.index]) {
      s.tokens=s.tokens.includes(n)?s.tokens.filter(i=>i!==n):[...s.tokens,n];s.feedback='';
    }
  }
  if(action.type==='sentence-clear' && s.phase==='arrange' && !s.checked) clear();
  if(action.type==='sentence-check' && s.phase==='arrange' && !s.checked) {
    if(s.tokens.length!==tokenCounts[s.index]) s.feedback='모든 말을 골라 문장을 완성해 주세요.';
    else {
      s.attempts++;
      s.checked=s.tokens.every((n,i)=>n===i);
      s.feedback=s.checked?'':['これは → わたしの → かばんです。 순서예요.','かばんは → まどの そばに → あります。 순서예요.','あかい かばんでは → ありません。 순서예요.'][s.index];
    }
  }
  if(action.type==='sentence-select' && s.phase==='solve' && ['window-red','door-blue','window-blue'].includes(action.id)) {s.selected=action.id;s.feedback='';}
  if(action.type==='sentence-submit' && s.phase==='solve') {
    if(!s.selected) s.feedback='가방을 먼저 골라 주세요.';
    else {
      s.attempts++;
      if(s.selected==='window-blue') {s.completed=true;s.phase='summary';s.feedback='';}
      else s.feedback=s.selected==='window-red'?'ありません은 아니라는 뜻이에요. 빨간 가방은 제외해요.':'まどの そば는 창문 옆이에요. 위치를 확인해 주세요.';
    }
  }
  return s;
}
