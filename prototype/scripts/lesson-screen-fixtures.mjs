import {sentenceId} from '../src/sentence-state.js';
import {basicLessons,basicSinglePass,basicHasIntro,basicGroup} from '../src/basics-state.js';
import {kanaLessons,kanaRound} from '../src/kana-state.js';
import {koreanCase,koreanLessons,koreanHasSpeaking,koreanQuizOnly,koreanStageZero,koreanGroup,koreanExplanation} from '../src/korean-state.js';
import {practiceUnits} from '../src/practice-content.js';
function originals(s,kind,count){
 const pages=[],add=(phase,index=0,extra={})=>pages.push({...(phase?{phase}:{}),index,...extra});
 if(kind==='kana'){
  const lesson=kanaLessons[s.kana.active];
  for(let start=0;start<count;){const r=kanaRound(lesson,start);add('intro',start);for(let i=start;i<r.end;i++)add('learn',i);for(let i=start;i<r.end;i++)add('reading',i);add('quiz',start);start=r.end;}
 }else if(kind==='basic'||kind==='korean'){
  if(kind==='korean'&&koreanCase(s.korean.active)&&!['5-1','6-1','7-1'].includes(s.korean.active))add('scenario');
  const quizOnly=kind==='korean'&&koreanQuizOnly(koreanLessons.find(l=>l.id===s.korean.active));
  if(kind==='basic'&&s.basics.active<11&&basicHasIntro(s.basics.active))add('intro');
  for(let i=0;i<count;i++){if(kind==='korean'&&['5-1','6-1','7-1'].includes(s.korean.active))add('scenario',i);if(kind==='korean'&&koreanExplanation(s.korean.active)&&i===koreanGroup(s.korean.active,i).start)add('intro',i);if(kind==='basic'&&s.basics.active>=11&&i===basicGroup(s.basics.active,i).start)add('intro',i);if(!quizOnly)add('learn',i);if(kind==='korean'&&koreanExplanation(s.korean.active))continue;if(kind==='basic'&&basicSinglePass(s.basics.active)||kind==='korean'&&koreanStageZero(s.korean.active))add('write',i);if(kind!=='basic'||s.basics.active!==10)add('quiz',i);if(kind==='korean'&&koreanHasSpeaking(s.korean.active))add('speak',i);}
 }else if(kind==='labels'){add('intro');for(let i=0;i<count;i++){add('read',i);add('build',i);}add('match',count-1);}
 else if(kind==='listening'){for(let i=0;i<count;i++)add('',i);}
 else if(kind==='sentence'){add('intro');for(let i=0;i<count;i++){add('learn',i);add('arrange',i);add('speak',i);}if(sentenceId(s)!==3)add('solve',count-1);}
 else if(kind==='dialogue'){add('intro');for(let i=0;i<3;i++)add('learn',i);for(let i=0;i<3;i++)add('practice',i);}
 else if(kind==='reading'){for(let i=0;i<6;i++){if(i%2===0){add('intro',i);add('learn',i);}add('read',i);}}
 else if(kind==='play')for(const [step,lesson,transfer] of [['intro',0],['learn',0],['learn',1],['investigate',1],['solved',1],['transfer',1,'not_attempted'],['transfer',1,'passed']])pages.push({step,lesson,...(transfer?{transfer}:{})});
 return pages;
}
export const lessonScreens=(s,kind)=>originals(s,kind,kind==='basic'?basicLessons.find(l=>l.id===s.basics.active).count:practiceUnits(s,kind).length);
