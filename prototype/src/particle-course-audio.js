import {courseVoicePath} from './course-voice-path.js';

// Original sentence audio is bundled with the app, including offline lessons.
export function particleCourseAudio(text){
 const audioFile=courseVoicePath('ko-KR',text);
 return {id:`particle.${audioFile.split('/').pop().slice(0,-4)}`,text,locale:'ko-KR',status:'ready',audioFile,bundled:true,playbackRate:1,voiceId:'Supertonic 3 M1'};
}
