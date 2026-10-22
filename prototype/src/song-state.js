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
].map(l=>({...l,level:2,count:1,revision:1,released:false}));
export const songsForCourse=s=>songLessons.filter(l=>(developmentMode||l.released)&&l.direction===s.courseDirection&&l.level===courseGroup(s.onboardingLevel));
export const songLesson=(s,id=s.songActive)=>songsForCourse(s).find(l=>l.id===id);
export const freshSong=(version=1)=>({version,started:false,completed:false,phase:'listen',selected:null,checked:false,retry:false,resume:null});
export const songProgress=(s,id=s.songActive)=>{const l=songLessons.find(l=>l.id===id),p=s.songs?.[id];return p?.version===(l?.revision??1)?p:freshSong(l?.revision);};
export const resumeSongLesson=s=>{const lessons=songsForCourse(s);return [lessons.find(l=>l.id===s.songActive),...lessons.filter(l=>l.id!==s.songActive)].find(l=>l&&songProgress(s,l.id).started&&!songProgress(s,l.id).completed);};
export const songStages=['listen','gap','learn','apply','encore','done'];
export function validSongs(s){
 const object=x=>Boolean(x&&typeof x==='object'&&!Array.isArray(x));
 return (s.songActive===undefined||songLessons.some(l=>l.id===s.songActive))&&(s.songs===undefined||object(s.songs)&&Object.entries(s.songs).every(([id,p])=>{
  const l=songLessons.find(l=>l.id===id);
  return Boolean(l&&object(p)&&p.version===l.revision&&typeof p.started==='boolean'&&typeof p.completed==='boolean'&&songStages.includes(p.phase)&&[null,0,1,2].includes(p.selected)&&typeof p.checked==='boolean'&&typeof p.retry==='boolean'&&[null,'gap','learn','apply','encore'].includes(p.resume)&&(p.resume===null||p.phase==='listen')&&(!p.checked||p.selected!==null)&&(!p.checked||!p.retry)&&(p.phase!=='done'||p.completed));
 }));
}
export function reduceSong(s,a,lessons=songsForCourse(s)){
 const id=a.type==='song-start'?a.id??s.songActive:s.songActive,l=lessons.find(l=>l.id===id);if(!l)return s;
 const p={...songProgress(s,id)};
 if(a.type==='song-start'){p.started=true;if(a.restart||p.phase==='done')Object.assign(p,freshSong(l.revision),{started:true,completed:p.completed});}
 else if(!p.started)return s;
 else {
  const at=songStages.indexOf(p.phase),question=['gap','apply'].includes(p.phase);
  if(a.type==='song-select'&&question&&!p.checked&&[0,1,2].includes(Number(a.id))){p.selected=Number(a.id);p.retry=false;}
  else if(a.type==='song-check'&&question&&!p.checked&&p.selected!==null){p.checked=p.selected===l.answers[p.phase==='gap'?0:1];p.retry=!p.checked;}
  else if(a.type==='song-next'&&p.phase==='listen'&&p.resume){p.phase=p.resume;p.resume=null;}
  else if(a.type==='song-next'&&at>=0&&at<5&&(!question||p.checked)){p.phase=songStages[at+1];p.selected=null;p.checked=false;p.retry=false;if(p.phase==='done')p.completed=true;}
  else if(a.type==='song-previous'&&at>0&&at<5){p.phase=songStages[at-1];p.selected=null;p.checked=false;p.retry=false;}
  else if(a.type==='song-replay'&&at>0&&at<5){p.resume=p.phase;p.phase='listen';}
  else return s;
 }
 return {...s,songActive:id,songs:{...s.songs,[id]:p}};
}
