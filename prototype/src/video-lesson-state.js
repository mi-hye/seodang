import {courseVideos} from './course-video-catalog.js';
import {courseGroup} from './curriculum.js';
import {songsForCourse} from './song-state.js';
import {lessonNumberWithSpecials} from './lesson-order.js';
// Only catalogue and progress load with the map; video and lesson copy load on entry.
export const videoLessons=[
 ...courseVideos,
 {id:'chiikawa-offer',direction:'ko-ja',level:2,number:12,title:'치이카와 장면으로 음식 권하기',count:1},
 {id:'hospital-thanks',direction:'ja-ko',level:2,number:12,title:'ドラマでお礼の理由を伝える',count:1},
 {id:'frieren-just-right',direction:'ko-ja',level:2,number:9,title:'치이카와 장면으로 할 일 알려 주기',count:1,revision:2},
 {id:'hospital-appreciation',direction:'ja-ko',level:2,number:9,title:'ドラマで相手の苦労をねぎらう',count:1},
 {id:'frieren-subtext',direction:'ko-ja',level:7,number:9,title:'속뜻 탐정: 말 뒤의 마음',count:1,mode:'detective',revision:2,answers:[1,2]},
 {id:'misaeng-subtext',direction:'ja-ko',level:7,number:9,title:'言葉の裏にある気持ちを探る',count:1,mode:'detective',revision:2,answers:[1,2]},
 {id:'frieren-wait',direction:'ko-ja',level:2,number:6,title:'프리렌 장면으로 잠깐 기다려 달라고 말하기',count:1},
 {id:'hospital-effort',direction:'ja-ko',level:2,number:6,title:'ドラマで「頑張ります」を伝える',count:1},
{"id": "frieren-reaction", "direction": "ko-ja", "level": 2, "number": 3, "title": "프리렌 장면으로 반응하기", "count": 1},
{"id": "frieren-uncertainty", "direction": "ko-ja", "level": 5, "number": 3, "title": "프리렌 장면으로 가능성 말하기", "count": 1},
{"id": "frieren-opinion", "direction": "ko-ja", "level": 7, "number": 3, "title": "프리렌 장면으로 조심스럽게 제안하기", "count": 1},
{"id": "hospital-reassurance", "direction": "ja-ko", "level": 2, "number": 3, "title": "ドラマで「大丈夫」を伝える", "count": 1},
{"id": "blackdog-help", "direction": "ja-ko", "level": 4, "number": 3, "title": "ドラマで手助けを申し出る", "count": 1},
{"id": "queen-condition", "direction": "ja-ko", "level": 5, "number": 3, "title": "ドラマで状況による変化を伝える", "count": 1},

 {id:'frieren',direction:'ko-ja',level:4,number:3,title:'프리렌 장면으로 표현 배우기',count:2},
 {id:'misaeng',direction:'ja-ko',level:7,number:3,title:'ドラマで方法を尋ねて理解を確かめる',count:2,revision:2},
 {id:'frieren-permission',direction:'ko-ja',level:4,number:6,title:'프리렌 장면으로 허락 구하기',count:1,mode:'scene',revision:2,answers:[2,0]},
 {id:'blackdog-confirmation',direction:'ja-ko',level:4,number:6,title:'ドラマでできるか確かめる',count:1,mode:'scene',revision:2,answers:[1,2]},
 {id:'frieren-realization',direction:'ko-ja',level:5,number:6,title:'프리렌 장면으로 새로운 생각에 반응하기',count:1},
 {id:'queen-belief',direction:'ja-ko',level:5,number:6,title:'ドラマで相手の考えに気づく',count:1},
 {id:'frieren-inference',direction:'ko-ja',level:7,number:6,title:'프리렌 장면으로 이해한 내용 확인하기',count:1},
 {id:'blackdog-nuance',direction:'ja-ko',level:7,number:6,title:'ドラマで一部を認めて意見を伝える',count:1}
].map(lesson=>{
 const levelFiveAnswers={'frieren-opinion':[1,2],'frieren-inference':[0,1],'blackdog-nuance':[2,0],misaeng:[1,2,0,1]};
 if(levelFiveAnswers[lesson.id])return {...lesson,mode:'scene',revision:lesson.id==='misaeng'?3:2,answers:levelFiveAnswers[lesson.id]};
 const levelFourAnswers={"frieren-uncertainty": [1, 2], "frieren-realization": [0, 1], "queen-condition": [2, 0], "queen-belief": [1, 2]};
 if(levelFourAnswers[lesson.id])return {...lesson,mode:'scene',revision:2,answers:levelFourAnswers[lesson.id]};
 if(lesson.level!==2||lesson.mode==='scene')return lesson;
 const answers={'frieren-reaction':[1,2],'hospital-reassurance':[0,1],'frieren-wait':[2,0],'hospital-effort':[1,2],'frieren-just-right':[0,1],'hospital-appreciation':[2,0],'chiikawa-offer':[1,2],'hospital-thanks':[0,1]};
 return {...lesson,mode:'scene',revision:3,answers:answers[lesson.id]};
});
export const videosForCourse=s=>videoLessons.filter(l=>l.direction===s.courseDirection&&l.level===courseGroup(s.onboardingLevel)).map(l=>l.level===2&&l.number===18&&!songsForCourse(s).length?{...l,number:15}:l).sort((a,b)=>a.number-b.number);
export const videoLesson=(s,id=s.videoActive)=>{const lessons=videosForCourse(s);return lessons.find(l=>l.id===id)||lessons[0];};
export const resumeVideoLesson=s=>{const lessons=videosForCourse(s),active=videoLesson(s);return [active,...lessons.filter(l=>l!==active)].find(l=>l&&videoProgress(s,l.id).started&&!videoProgress(s,l.id).completed);};
// Display positions change; saved lesson IDs remain stable.
export const lessonNumberWithVideo=(s,number)=>lessonNumberWithSpecials(number,[...videosForCourse(s),...songsForCourse(s)]);
export const freshVideo=(version=1,mode)=>({version,started:false,completed:false,index:0,phase:'watch',...(['detective','scene'].includes(mode)?{selected:null,checked:false,retry:false,resume:null}:{})});
export const videoProgress=(s,id)=>{
 const l=videoLesson(s,id),p=s.videoLessons?.[l?.id],version=l?.revision??1;
 if(p?.version===version)return p.phase==='speak'?{...p,phase:'learn'}:p;
 const fresh=freshVideo(version,l?.mode);
 // Content is unchanged: preserve completion, but restart retired generic reviews at the scene.
 if(l?.mode==='scene'&&p&&p.version>=(['frieren-just-right','misaeng'].includes(l.id)?2:1))return {...fresh,started:p.started,completed:p.completed,phase:p.phase==='done'?'done':'watch'};
 return fresh;
};
export function validVideoLessons(s){
 return (s.videoActive===undefined||videoLessons.some(l=>l.id===s.videoActive))&&(s.videoLessons===undefined||Boolean(s.videoLessons&&typeof s.videoLessons==='object'&&!Array.isArray(s.videoLessons)&&Object.entries(s.videoLessons).every(([id,p])=>{
  const l=videoLessons.find(l=>l.id===id);if(!l)return false;
  const scene=l.mode==='scene',legacy=scene&&p?.version!==l.revision;
  const versions=scene&&['frieren-just-right','misaeng'].includes(l.id)?[1,2,3]:[1,l.revision??1];
  if(!versions.includes(p?.version)||typeof p.started!=='boolean'||typeof p.completed!=='boolean'||!Number.isInteger(p.index)||p.index<0||p.index>=(l.id==='misaeng'&&p.version===1?1:l.count)||p.phase==='done'&&!p.completed)return false;
  if(l.mode==='detective'||scene&&!legacy){
   const questions=scene?['meaning','use']:['infer','clue'],phases=['watch',...questions,'learn','done'];
   return phases.includes(p.phase)&&[null,0,1,2].includes(p.selected)&&typeof p.checked==='boolean'&&typeof p.retry==='boolean'&&[undefined,null,...questions,'learn'].includes(p.resume)&&(p.resume==null||p.phase==='watch')&&(!p.checked||p.selected!==null);
  }
  return ['watch','learn','speak','done'].includes(p.phase);
 })));
}
export function reduceVideo(s,a){
 const l=videoLesson(s,a.type==='video-start'?a.id??s.videoActive:s.videoActive);if(!l||a.type==='video-start'&&a.id!==undefined&&a.id!==l.id)return s;const p={...videoProgress(s,l.id)};
 if(a.type==='video-start'){p.started=true;if(p.phase==='done'||a.restart)Object.assign(p,freshVideo(l.revision??1,l.mode),{started:true,completed:p.completed});}
 else if(!p.started)return s;
 else if(l.mode==='detective'||l.mode==='scene'){
  const scene=l.mode==='scene',questions=scene?['meaning','use']:['infer','clue'];
  const stages=scene?['watch','meaning','learn','use','done']:['watch','infer','clue','learn','done'],at=stages.indexOf(p.phase),question=questions.includes(p.phase);
  if(a.type==='video-select'&&question&&!p.checked&&[0,1,2].includes(Number(a.id))){p.selected=Number(a.id);p.retry=false;}
  else if(a.type==='video-check'&&question&&!p.checked&&p.selected!==null){p.checked=p.selected===l.answers[(scene?p.index*2:0)+questions.indexOf(p.phase)];p.retry=!p.checked;}
  else if(a.type==='video-next'&&p.phase==='watch'&&p.resume){p.phase=p.resume;p.resume=null;}
  else if(a.type==='video-next'&&at<4&&(!question||p.checked)){p.phase=stages[at+1];p.selected=null;p.checked=false;p.retry=false;if(p.phase==='done'){if(scene&&p.index+1<l.count){p.index++;p.phase='watch';}else p.completed=true;}}
  else if(a.type==='video-previous'&&scene&&at===0&&p.index>0&&!p.resume){p.index--;p.phase='use';p.selected=null;p.checked=false;p.retry=false;}
  else if(a.type==='video-previous'&&at>0&&at<4){p.phase=stages[at-1];p.selected=null;p.checked=false;p.retry=false;}
  else if(a.type==='video-replay'&&at>0&&at<4){p.resume=p.phase;p.phase='watch';}
  else return s;
 }
 else if(a.type==='video-next'){
  if(p.phase==='watch')p.phase='learn';
  else if(p.phase==='learn'){if(p.index+1<l.count){p.index++;p.phase='watch';}else{p.phase='done';p.completed=true;}}else return s;
 }else if(a.type==='video-previous'){
  if(p.phase==='learn')p.phase='watch';else if(p.phase==='watch'&&p.index){p.index--;p.phase='learn';}else return s;
 }else if(a.type==='video-replay')p.phase='watch';else return s;
 return {...s,videoActive:l.id,videoLessons:{...s.videoLessons,[l.id]:p}};
}
