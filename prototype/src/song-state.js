import {courseSongs} from './course-song-catalog.js';
import {courseGroup} from './curriculum.js';
import {developmentMode} from './build-config.js';

// Rights approval is explicit per song. Unapproved previews stay in local builds.
export const songLessons=[
 {id:'jp-arigatou',direction:'ko-ja',number:5,title:'노래로 고마운 마음 전하기',answers:[0,2]},
 {id:'jp-cherry',direction:'ko-ja',number:10,title:'노래로 기억하는 마음 전하기',answers:[1,0]},
 {id:'jp-marigold',direction:'ko-ja',number:15,title:'노래로 함께 있고 싶은 마음 전하기',answers:[2,1]},
 {id:'ko-night-letter',direction:'ja-ko',number:5,title:'歌でおやすみの挨拶をする',answers:[1,0]},
 {id:'ko-travel',direction:'ja-ko',number:10,title:'歌で出かける気持ちを伝える',answers:[2,1]},
 {id:'ko-love-lee',direction:'ja-ko',number:15,title:'歌で好きな気持ちを伝える',answers:[0,2]},
 ...courseSongs,
].map(l=>({level:2,count:1,revision:1,released:false,...l}));
export const songsForCourse=s=>songLessons.filter(l=>(developmentMode||l.released)&&l.direction===s.courseDirection&&l.level===courseGroup(s.onboardingLevel));
export const songLesson=(s,id=s.songActive)=>songsForCourse(s).find(l=>l.id===id);
const songLearnsFirst=id=>songLessons.some(l=>l.id===id&&(l.number===15||l.learnFirst));
export const freshSong=(version=1,id)=>({version,...(songLearnsFirst(id)?{learningVersion:1}:{}),started:false,completed:false,phase:'listen',selected:null,checked:false,retry:false,resume:null});
export const songProgress=(s,id=s.songActive)=>{const l=songLessons.find(l=>l.id===id),p=s.songs?.[id];return p?.version===(l?.revision??1)?p:freshSong(l?.revision,id);};
export const resumeSongLesson=s=>{const lessons=songsForCourse(s);return [lessons.find(l=>l.id===s.songActive),...lessons.filter(l=>l.id!==s.songActive)].find(l=>l&&songProgress(s,l.id).started&&!songProgress(s,l.id).completed);};
export const songStages=['listen','gap','learn','apply','encore','done'];
const learningFirstStages=['listen','learn','gap','apply','encore','done'];
export const songStagesFor=id=>songLearnsFirst(id)?learningFirstStages:songStages;
// A checked legacy gap still owes its original learning page. Keep that one
// transition's old ordering, including progress, until it reaches application.
const activeSongStages=(id,p)=>p.learningPending?songStages:songStagesFor(id);
export const songStageIndex=(id,p)=>activeSongStages(id,p).indexOf(p.resume||p.phase);
export const nextSongStage=(id,p)=>p.phase==='listen'&&p.resume?p.resume:activeSongStages(id,p)[activeSongStages(id,p).indexOf(p.phase)+1];
export function validSongs(s){
 const object=x=>Boolean(x&&typeof x==='object'&&!Array.isArray(x));
 return (s.songActive===undefined||songLessons.some(l=>l.id===s.songActive))&&(s.songs===undefined||object(s.songs)&&Object.entries(s.songs).every(([id,p])=>{
  const l=songLessons.find(l=>l.id===id);
  const owed=p?.resume||p?.phase;
  return Boolean(l&&object(p)&&p.version===l.revision&&(p.learningVersion===undefined||songLearnsFirst(id)&&p.learningVersion===1)&&(p.learningPending===undefined||p.learningPending===true&&songLearnsFirst(id)&&p.learningVersion===1&&(owed==='learn'||owed==='gap'&&p.checked))&&typeof p.started==='boolean'&&typeof p.completed==='boolean'&&songStages.includes(p.phase)&&[null,0,1,2].includes(p.selected)&&typeof p.checked==='boolean'&&typeof p.retry==='boolean'&&[null,'gap','learn','apply','encore'].includes(p.resume)&&(p.resume===null||p.phase==='listen')&&(!p.checked||p.selected!==null)&&(!p.checked||!p.retry)&&(p.phase!=='done'||p.completed));
 }));
}
export function reduceSong(s,a,lessons=songsForCourse(s)){
 const id=a.type==='song-start'?a.id??s.songActive:s.songActive,l=lessons.find(l=>l.id===id);if(!l)return s;
 const p={...songProgress(s,id)};
 if(a.type==='song-start'){
  // A replay stays on the video, but its unfinished legacy gap returns to learn.
  // Checked gaps retain the answer and still visit their original learning page.
  if(songLearnsFirst(id)&&p.learningVersion!==1){
   if((p.resume||p.phase)==='gap'){
    if(p.checked)p.learningPending=true;
    else{if(p.phase==='listen')p.resume='learn';else p.phase='learn';p.selected=null;p.retry=false;}
   }
   p.learningVersion=1;
  }
  p.started=true;if(a.restart||p.phase==='done'){delete p.learningPending;Object.assign(p,freshSong(l.revision,id),{started:true,completed:p.completed});}
 }
 else if(!p.started)return s;
 else {
  const stages=songStagesFor(id),at=stages.indexOf(p.phase),question=['gap','apply'].includes(p.phase);
  if(a.type==='song-select'&&question&&!p.checked&&[0,1,2].includes(Number(a.id))){p.selected=Number(a.id);p.retry=false;}
  else if(a.type==='song-check'&&question&&!p.checked&&p.selected!==null){p.checked=p.selected===l.answers[p.phase==='gap'?0:1];p.retry=!p.checked;}
  else if(a.type==='song-next'&&p.phase==='listen'&&p.resume){p.phase=p.resume;p.resume=null;}
  else if(a.type==='song-next'&&at>=0&&at<5&&(!question||p.checked)){p.phase=nextSongStage(id,p);if(p.phase==='apply')delete p.learningPending;p.selected=null;p.checked=false;p.retry=false;if(p.phase==='done')p.completed=true;}
  else if(a.type==='song-previous'&&at>0&&at<5){delete p.learningPending;p.phase=stages[at-1];p.selected=null;p.checked=false;p.retry=false;}
  else if(a.type==='song-replay'&&at>0&&at<5){p.resume=p.phase;p.phase='listen';}
  else return s;
 }
 return {...s,songActive:id,songs:{...s.songs,[id]:p}};
}
