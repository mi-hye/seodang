import {freshState} from '../src/engine.js';
import {normalizeKana,kanaLessons,kanaRound} from '../src/kana-state.js';import {freshBasic} from '../src/basics-state.js';import {freshLabels} from '../src/labels-state.js';import {freshListening} from '../src/listening-state.js';import {freshSentence} from '../src/sentence-state.js';import {freshDialogue} from '../src/dialogue-state.js';import {freshReading,readingAnswers} from '../src/reading-state.js';import {freshKoreanProgress} from '../src/korean-state.js';
const base=()=>({...freshState(),onboarded:true,onboardingLevel:1});
export function practiceCases(){const kana=normalizeKana();const round=kanaRound(kanaLessons[0],kanaLessons[0].letters.length-1);kana.lessons[0]={...kana.lessons[0],started:true,phase:'quiz',index:round.start,answered:true,matches:round.letters.map(l=>l.id)};
return [
 ['kana',{...base(),onboardingLevel:0,kana},{type:'kana-next'}],
 ['basic',{...base(),listening:{...freshListening(),completed:true,index:4},basics:{version:2,active:6,lessons:{6:{...freshBasic(),started:true,index:5,phase:'quiz',selected:2}}}},{type:'basic-check'}],
 ['labels',{...base(),kana:{...kana,lessons:kana.lessons.map(l=>({...l,completed:true}))},labels:{...freshLabels(),started:true,phase:'match',matches:['kasa','kutsu','hana']}},{type:'labels-match',left:'neko',right:'neko'}],
 ['listening',{...base(),labels:{...freshLabels(),completed:true},listening:{...freshListening(),started:true,index:3}},{type:'listening-answer',id:'kasa'}],
 ['play',{...base(),onboardingLevel:2,episode:{...base().episode,step:'transfer',transfer:'passed'}},{type:'next'}],
 ['sentence',{...base(),onboardingLevel:3,sentence:{...freshSentence(),started:true,phase:'solve',selected:'window-blue'}},{type:'sentence-submit'}],
 ['dialogue',{...base(),onboardingLevel:4,dialogue:{...freshDialogue(),started:true,phase:'practice',index:2,selected:0}},{type:'dialogue-check'}],
 ...[5,6,7].map(level=>['reading',{...base(),onboardingLevel:level,readings:{[level]:{...freshReading(),started:true,phase:'read',index:5,selected:readingAnswers[level][5],solved:[0,1,2,3,4]}}},{type:'reading-check'}]),
 ['korean',{...base(),courseDirection:'ja-ko',onboardingLevel:1,korean:{version:3,active:'1-11',lessons:{'1-11':{...freshKoreanProgress(),started:true,phase:'quiz',index:5,selected:2}}}},{type:'korean-check'}]
];}
