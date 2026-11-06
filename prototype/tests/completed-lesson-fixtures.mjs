import {freshScenario} from '../src/scenario-state.js';
import {freshKoreanProgress} from '../src/korean-state.js';
import {freshDialogue} from '../src/dialogue-state.js';
import {freshExpert} from '../src/expert-state.js';
import {freshVideo,videoLessons} from '../src/video-lesson-state.js';
import {freshSong,songLessons} from '../src/song-state.js';
export function completeMapLesson(s,l){
 const done=p=>({...p,started:true,completed:true,phase:'done'});
 if(l.action==='scenario')(s.scenarios||={})[`${s.courseDirection}:scenario:${l.id}`]=done(freshScenario(l.id));
 else if(l.action==='korean'){s.korean||={version:4,active:l.id,lessons:{}};s.korean.lessons[l.id]=done(freshKoreanProgress(l.id));}
 else if(l.action==='dialogue')s.dialogue=done(freshDialogue());
 else if(l.action==='expert')(s.experts||={})[`${s.courseDirection}:expert:${l.id}`]=done(freshExpert());
 else if(l.action==='video'){const v=videoLessons.find(v=>v.id===l.id);(s.videoLessons||={})[l.id]=done(freshVideo(v.revision,v.mode));}
 else if(l.action==='song'){const song=songLessons.find(v=>v.id===l.id);(s.songs||={})[l.id]=done(freshSong(song.revision,l.id));}
 else throw Error('Unsupported fixture '+l.action);
}
