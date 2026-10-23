import {levelTwoReviewData,levelTwoReviewWords} from './level-two-review-data.js';
import {isScenarioRehearsal,scenarioRehearsal} from './scenario-rehearsal-content.js';
export const expandedReviewWords=key=>{if(isScenarioRehearsal(key))return[];const c=levelTwoReviewData[key];return c?c.wordChoices.map(id=>levelTwoReviewWords[id][key.split(':')[0]]):[];};
// A stable shuffle preserves the same question after resume without teaching a position pattern.
function shuffledIds(tokens,seed){
 let n=2166136261;for(const ch of seed)n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;
 const ids=tokens.map((_,i)=>i);for(let i=ids.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[ids[i],ids[j]]=[ids[j],ids[i]];}
 if(ids.every((id,i)=>id===i))ids.push(ids.shift());return ids;
}
export function levelTwoReview(key){
 const rehearsal=scenarioRehearsal(key);if(rehearsal)return rehearsal;
 const c=levelTwoReviewData[key];if(!c)return null;
 const jp=key.startsWith('ja-ko:'),units=c.units,words=expandedReviewWords(key);
 const tasks=c.words.map((_,index)=>{const unit=words[index],order=shuffledIds(words,key+':word:'+index);return {review:true,type:'word',stage:-1,stageIndex:index,unitIndex:index,unit,scene:unit.meaning,prompt:unit.meaning,options:order.map(i=>words[i].text),optionAudio:order.map(i=>words[i].audio),optionPictures:order.map(i=>words[i].picture),optionLabels:order.map(i=>words[i].meaning),answer:order.indexOf(index)};});
 for(const stage of [0,1,2]){
  const sequence=units.length===3?[[1,2,0],[2,0,1],[0,2,1]][stage]:[[1,0],[0,1],[1,0]][stage];
  for(const [index,unitIndex]of sequence.entries()){
   const unit=units[unitIndex],base={review:true,stage,stageIndex:index,unitIndex,unit,scene:stage===1?unit.meaning:unit.scene};
   if(stage===1){const tokens=unit.tokens,all=[...tokens,unit.distractor],order=shuffledIds(all,key+':'+unitIndex);tasks.push({...base,type:'order',prompt:jp?'意味に合う文を作りましょう。':'뜻에 맞게 문장을 만들어요.',tokens:all,answerLength:tokens.length,tokenOrder:order});}
   else {const answer=(c.number+index+stage+(jp?1:0))%units.length,order=units.map((_,i)=>i).filter(i=>i!==unitIndex);order.splice(answer,0,unitIndex);tasks.push({...base,type:stage===0?'listen':'apply',prompt:stage===0?(jp?'どんな意味か選びましょう。':'어떤 뜻인지 골라요.'):'',options:order.map(i=>stage===0?units[i].meaning:units[i].text),optionAudio:stage===0?undefined:order.map(i=>units[i].audio),answer:order.indexOf(unitIndex)});}
  }
 }
 return tasks;
}
export const expandedReviewAudio=()=>Object.entries(levelTwoReviewData).flatMap(([key,c])=>[...c.units.map(u=>u.audio),...expandedReviewWords(key).map(w=>w.audio)]);
