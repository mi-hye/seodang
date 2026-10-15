import {freshState} from '../src/engine.js';
import {freshSentence} from '../src/sentence-state.js';import {freshDialogue} from '../src/dialogue-state.js';import {freshReading,readingAnswers} from '../src/reading-state.js';import {freshKoreanProgress} from '../src/korean-state.js';
export function caseFixtures(){return ['ko-ja','ja-ko'].flatMap(courseDirection=>[2,4,5,6,7].map(onboardingLevel=>{
 const s={...freshState(),onboarded:true,koreanGuideSeenVersion:1,courseDirection,onboardingLevel,settings:{sound:false,textScale:1.2,motion:'off'}};let kind,action;
 if(courseDirection==='ja-ko'){kind='korean';const id=onboardingLevel===2?'3-1':`${onboardingLevel}-1`,index=onboardingLevel<5?5:2;s.korean={version:4,active:id,lessons:{[id]:{...freshKoreanProgress(id),started:true,caseSeen:true,phase:'quiz',index,selected:index%3}}};action={type:'korean-check'};}
 else if(onboardingLevel===2){kind='sentence';s.sentence={...freshSentence(),started:true,phase:'solve',selected:'window-blue'};action={type:'sentence-submit'};}
 else if(onboardingLevel===4){kind='dialogue';s.dialogue={...freshDialogue(),started:true,phase:'practice',index:2,selected:0};action={type:'dialogue-check'};}
 else{kind='reading';s.readings={[onboardingLevel]:{...freshReading(),started:true,index:5,phase:'read',selected:readingAnswers[onboardingLevel][5],solved:[0,1,2,3,4]}};action={type:'reading-check'};}
 return [kind,s,action];
}));}
