// Only bounded progress is eager; lesson material, drawing are lazy.
export const practiceRounds=3;
export const isCasePractice=key=>/^(ko-ja:sentence:[0123]|ko-ja:dialogue:0|ko-ja:reading:[567]|ja-ko:korean:3-[1234]|ja-ko:korean:[4567]-1)$/.test(key);
export const practiceRoundCount=key=>isCasePractice(key)||/^ko-ja:basic:(9|10)$/.test(key)?1:practiceRounds;
export const normalizeCasePractice=(p,key)=>p&&isCasePractice(key)&&p.caseVersion!==1?{...p,caseVersion:1,round:0,mode:0,index:0}:p;
export const practiceModes=['listen','write'];
export const practiceHasWriting=key=>/^ko-ja:kana:/.test(key)||/^ko-ja:basic:(?!6$)\d+$/.test(key)||/^ja-ko:korean:1-(?:[1-9]|10)$/.test(key);
export function validPractices(entries){return entries===undefined||Boolean(entries&&typeof entries==='object'&&!Array.isArray(entries)&&Object.keys(entries).length<=32&&Object.entries(entries).every(([key,p])=>/^(ko-ja|ja-ko):(kana|basic|labels|listening|play|sentence|dialogue|reading|korean):[\d-]+$/.test(key)&&p?.version===1&&Number.isInteger(p.round)&&p.round>=0&&p.round<4&&Number.isInteger(p.mode)&&p.mode>=0&&p.mode<4&&Number.isInteger(p.index)&&p.index>=0&&p.index<46&&Number.isInteger(p.count)&&p.count>0&&p.count<=46&&p.index<p.count&&p.action&&['kana-next','basic-check','basic-next','labels-match','labels-next','listening-answer','next','sentence-submit','sentence-check','dialogue-check','reading-check','korean-check'].includes(p.action.type)&&Object.values(p.action).every(v=>typeof v==='string'||typeof v==='number')));}
export function normalizePractice(p,rounds=practiceRounds,writing=true){
 if(!p)return p;
 if(!writing){
  if(p.round>=rounds)return {...p,round:rounds-1,mode:0,index:p.count-1};
  if(p.mode!==0)return p.round<rounds-1?{...p,round:p.round+1,mode:0,index:0}:{...p,mode:0,index:p.count-1};
  return p;
 }
 if(p.round>=rounds)return {...p,round:rounds-1,mode:2,index:p.count-1};
 if(p.mode===3)return p.round<rounds-1?{...p,round:p.round+1,mode:0,index:0}:{...p,mode:2,index:p.count-1};
 return p.mode===1?{...p,mode:2,index:0}:p;
}
export function advancePractice(p,rounds=practiceRounds,writing=true){const next=structuredClone(normalizePractice(p,rounds,writing));if(++next.index<next.count)return next;next.index=0;if(writing&&next.mode===0){next.mode=2;return next;}next.mode=0;if(++next.round<rounds)return next;return null;}
