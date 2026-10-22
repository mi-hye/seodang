import {freshState} from '../src/engine.js';
import {freshScenario,scenarioHasSpeaking} from '../src/scenario-state.js';
import {freshVideo,videoLessons} from '../src/video-lesson-state.js';
import {freshSentence} from '../src/sentence-state.js';
import {freshKoreanProgress} from '../src/korean-state.js';
export function reviewFixture(key){
 const [courseDirection,kind,id]=key.split(':'),s={...freshState(),onboarded:true,onboardingLevel:2,courseDirection,koreanGuideSeenVersion:1,settings:{sound:false,motion:'off',textScale:1.2,audioRate:1}};let action;
 if(kind==='scenario'){s.scenarioActive=id;s.scenarios={[key]:{...freshScenario(),started:true,index:2,phase:scenarioHasSpeaking(id)?'speak':'quiz',checked:true}};action={type:scenarioHasSpeaking(id)?'scenario-speak-next':'scenario-next'};}
 if(kind==='video'){s.videoActive=id;s.videoLessons={[id]:{...freshVideo(videoLessons.find(x=>x.id===id).revision||1),started:true,phase:'learn'}};action={type:'video-next'};}
 if(kind==='sentence'){s.sentenceActive=Number(id);s.sentenceLessons={[id]:{...freshSentence(),started:true,index:2,phase:'solve',selected:id==='1'?'1':'2',learned:[0,1,2]}};action={type:'sentence-submit'};}
 if(kind==='korean'){s.korean={version:4,active:id,lessons:{[id]:{...freshKoreanProgress(id),started:true,index:2,phase:'speak',caseSeen:true}}};action={type:'korean-speak-next'};}
 return {s,kind,id,action};
}
