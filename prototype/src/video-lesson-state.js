import {courseGroup} from './curriculum.js';
// Only catalogue and progress load with the map; video and lesson copy load on entry.
export const videoLessons=[
 {id:'frieren-wait',direction:'ko-ja',level:2,number:6,title:'프리렌 장면으로 잠깐 기다려 달라고 말하기',count:1},
 {id:'hospital-effort',direction:'ja-ko',level:2,number:6,title:'ドラマで「頑張ります」を伝える',count:1},
{"id": "frieren-reaction", "direction": "ko-ja", "level": 2, "number": 3, "title": "프리렌 장면으로 반응하기", "count": 1},
{"id": "frieren-uncertainty", "direction": "ko-ja", "level": 5, "number": 3, "title": "프리렌 장면으로 가능성 말하기", "count": 1},
{"id": "frieren-opinion", "direction": "ko-ja", "level": 7, "number": 3, "title": "프리렌 장면으로 조심스럽게 제안하기", "count": 1},
{"id": "hospital-reassurance", "direction": "ja-ko", "level": 2, "number": 3, "title": "ドラマで「大丈夫」を伝える", "count": 1},
{"id": "blackdog-help", "direction": "ja-ko", "level": 4, "number": 3, "title": "ドラマで手助けを申し出る", "count": 1},
{"id": "queen-condition", "direction": "ja-ko", "level": 5, "number": 3, "title": "ドラマで状況による変化を伝える", "count": 1},

 {id:'frieren',direction:'ko-ja',level:4,number:3,title:'프리렌 장면으로 표현 배우기',count:2},
 {id:'misaeng',direction:'ja-ko',level:7,number:3,title:'미생 장면으로 묻고 확인하기',count:2,revision:2},
 {id:'frieren-permission',direction:'ko-ja',level:4,number:6,title:'프리렌 장면으로 허락 구하기',count:1},
 {id:'blackdog-confirmation',direction:'ja-ko',level:4,number:6,title:'ドラマでできるか確かめる',count:1},
 {id:'frieren-realization',direction:'ko-ja',level:5,number:6,title:'프리렌 장면으로 새로운 생각에 반응하기',count:1},
 {id:'queen-belief',direction:'ja-ko',level:5,number:6,title:'ドラマで相手の考えに気づく',count:1},
 {id:'frieren-inference',direction:'ko-ja',level:7,number:6,title:'프리렌 장면으로 이해한 내용 확인하기',count:1},
 {id:'blackdog-nuance',direction:'ja-ko',level:7,number:6,title:'ドラマで一部を認めて意見を伝える',count:1}
];
export const videosForCourse=s=>videoLessons.filter(l=>l.direction===s.courseDirection&&l.level===courseGroup(s.onboardingLevel)).sort((a,b)=>a.number-b.number);
export const videoLesson=(s,id=s.videoActive)=>{const lessons=videosForCourse(s);return lessons.find(l=>l.id===id)||lessons[0];};
export const resumeVideoLesson=s=>{const lessons=videosForCourse(s),active=videoLesson(s);return [active,...lessons.filter(l=>l!==active)].find(l=>l&&videoProgress(s,l.id).started&&!videoProgress(s,l.id).completed);};
// Display positions change; saved lesson IDs remain stable.
export const lessonNumberWithVideo=(s,number)=>{for(const video of videosForCourse(s))if(number>=video.number)number++;return number;};
export const freshVideo=(version=1)=>({version,started:false,completed:false,index:0,phase:'watch'});
export const videoProgress=(s,id)=>{const l=videoLesson(s,id),p=s.videoLessons?.[l?.id],version=l?.revision??1;return p?.version===version?(p.phase==='speak'?{...p,phase:'learn'}:p):freshVideo(version);};
export function validVideoLessons(s){return (s.videoActive===undefined||videoLessons.some(l=>l.id===s.videoActive))&&(s.videoLessons===undefined||Boolean(s.videoLessons&&typeof s.videoLessons==='object'&&!Array.isArray(s.videoLessons)&&Object.entries(s.videoLessons).every(([id,p])=>{const l=videoLessons.find(l=>l.id===id);return l&&[1,l.revision??1].includes(p?.version)&&typeof p.started==='boolean'&&typeof p.completed==='boolean'&&Number.isInteger(p.index)&&p.index>=0&&p.index<(l.id==='misaeng'&&p.version===1?1:l.count)&&['watch','learn','speak','done'].includes(p.phase)&&(p.phase!=='done'||p.completed);})));}
export function reduceVideo(s,a){
 const l=videoLesson(s,a.type==='video-start'?a.id??s.videoActive:s.videoActive);if(!l||a.type==='video-start'&&a.id!==undefined&&a.id!==l.id)return s;const p={...videoProgress(s,l.id)};
 if(a.type==='video-start'){p.started=true;if(p.phase==='done'||a.restart)Object.assign(p,freshVideo(l.revision??1),{started:true,completed:p.completed});}
 else if(!p.started)return s;
 else if(a.type==='video-next'){
  if(p.phase==='watch')p.phase='learn';
  else if(p.phase==='learn'){if(p.index+1<l.count){p.index++;p.phase='watch';}else{p.phase='done';p.completed=true;}}else return s;
 }else if(a.type==='video-previous'){
  if(p.phase==='learn')p.phase='watch';else if(p.phase==='watch'&&p.index){p.index--;p.phase='learn';}else return s;
 }else if(a.type==='video-replay')p.phase='watch';else return s;
 return {...s,videoActive:l.id,videoLessons:{...s.videoLessons,[l.id]:p}};
}
