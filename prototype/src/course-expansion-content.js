import {courseVoicePath} from './course-voice-path.js';
const loaders={
 course20:()=>import('./course-twenty-content.js').then(m=>m.courseTwentyContent),
 course1:()=>import('./course-one-content.js').then(m=>m.courseOneContent),
 course3:()=>import('./course-three-content.js').then(m=>m.courseThreeContent),
 course4:()=>import('./course-four-content.js').then(m=>m.courseFourContent),
 course5:()=>import('./course-five-content.js').then(m=>m.courseFiveContent)
};
const content={},pending={};
export async function prepareCourseExpansion(id){
 const group=String(id).split('-')[0];
 if(!loaders[group])return null;
 if(!content[group]){
  pending[group]??=loaders[group]().catch(error=>{delete pending[group];throw error;});
  content[group]=await pending[group];
 }
 return content[group];
}
export const expandedCourseContent=(direction,id)=>content[String(id).split('-')[0]]?.[direction]?.[id];
export const courseVoice=(direction,id,part,text)=>{
 const locale=direction==='ko-ja'?'ja-JP':'ko-KR';
 return {id:`scenario.${direction}.${id}.${part}`,text,locale,status:'ready',audioFile:courseVoicePath(locale,text),bundled:true,playbackRate:1};
};
