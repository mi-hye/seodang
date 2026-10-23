import {expandedCourseContent,courseVoice} from './course-expansion-content.js';
import {expansionReview} from './course-expansion-state.js';
import {courseDisplayParts} from './course-expansion-display.js';
import {courseChoiceParts} from './course-choice-display.js';

const tokenOrder=(parts,seed)=>{
 let n=2166136261;for(const ch of seed)n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;
 const ids=parts.map((_,i)=>i);for(let i=ids.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[ids[i],ids[j]]=[ids[j],ids[i]];}
 if(ids.every((id,i)=>id===i))ids.push(ids.shift());return ids;
};
export function courseExpansionReview(key){
 if(!expansionReview(key))return null;
 const [direction,,id]=key.split(':'),c=expandedCourseContent(direction,id);
 if(!c)return null;
 const voice=(part,text)=>courseVoice(direction,id,part,text),jp=direction==='ja-ko';
 const readingWords=c.activity==='words',listenInstead=readingWords||id==='course1-17';
 const orders=c.items.map((x,index)=>({review:true,type:'order',stage:1,unitIndex:index,unit:{text:x.answer,phrases:courseDisplayParts(x.answerParts),meaning:x.answerMeaning,audio:voice(`${index}.answer`,x.answer)},scene:x.answerMeaning,prompt:jp?'意味に合う文を作りましょう。':'뜻에 맞게 문장을 만들어요.',tokens:x.answerParts,answerLength:x.answerParts.length,tokenOrder:tokenOrder(x.answerParts,key+index),acceptedOrders:x.acceptedOrders}));
 const recall=listenInstead?c.items.map((x,index)=>({review:true,type:'listen',stage:0,unitIndex:index,unit:{text:readingWords?x.text:x.answer,meaning:readingWords?x.meaning:x.answerMeaning,audio:voice(`${index}.${readingWords?'prompt':'answer'}`,readingWords?x.text:x.answer)},prompt:'聞こえた言葉の意味を選びましょう。',options:c.items.map(y=>readingWords?y.meaning:y.answerMeaning),answer:index})):orders;
 const transfers=c.items.map((x,index)=>{
  const t=x.transfer,answer=t.options[t.answer];
  return {review:true,type:'apply',stage:2,unitIndex:index,unit:{text:answer,phrases:jp?undefined:courseChoiceParts(answer),meaning:t.explanation,audio:voice(`${index}.transfer.${t.answer}`,answer)},scene:t.prompt,prompt:'',options:t.options,optionPhrases:jp?undefined:t.options.map(courseChoiceParts),optionAudio:t.options.map((text,i)=>voice(`${index}.transfer.${i}`,text)),answer:t.answer};
 });
 // Cross the expression order so review is recall, not remembering the last choice.
 return [recall[1],recall[2],recall[0],transfers[2],transfers[0],transfers[1]];
}
