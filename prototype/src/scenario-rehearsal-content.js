import {levelTwoReviewData} from './level-two-review-data.js';
import {scenarioContent,scenarioAudio,scenarioChoiceAudio,scenarioRoleAudio} from './scenario-content.js';

export const isScenarioRehearsal=key=>typeof key==='string'&&/^(ko-ja|ja-ko):scenario:(14|15|16|17)$/.test(key);

// Keep the conversation in order while giving each turn a stable token layout after resume.
function shuffledIds(tokens,seed){
 let n=2166136261;for(const ch of seed)n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;
 const ids=tokens.map((_,i)=>i);for(let i=ids.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[ids[i],ids[j]]=[ids[j],ids[i]];}
 if(ids.every((id,i)=>id===i))ids.push(ids.shift());return ids;
}

export function scenarioRehearsal(key){
 if(!isScenarioRehearsal(key))return null;
 const [direction,,id]=key.split(':'),sceneContent=scenarioContent[direction][id],units=levelTwoReviewData[key].units;
 const turns=sceneContent.items.map((item,index)=>({
  index,unitIndex:index,unit:units[index],item,
  promptAudio:scenarioAudio(direction,id,index),
  answerAudio:scenarioChoiceAudio(direction,id,index,0),
  replyAudio:item.reply?scenarioRoleAudio(direction,index,'reply',id):null
 }));
 return turns.map(turn=>{
  const {index,unit,item}=turn,tokens=[...unit.tokens,unit.distractor];
  return {...turn,review:true,rehearsal:true,type:'order',stage:0,stageIndex:index,sceneContent,
   scene:sceneContent.scene,prompt:item.prompt,previous:turns.slice(0,index),
   tokens,answerLength:unit.tokens.length,...(id==='17'&&index===2?{acceptedOrders:[[0,1],[1,0]]}:{}),tokenOrder:shuffledIds(tokens,`${key}:rehearsal:${index}`)};
 });
}
