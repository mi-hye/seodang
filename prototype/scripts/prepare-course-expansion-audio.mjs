import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {courseExpansionCatalog} from '../src/course-expansion-state.js';
import {prepareCourseExpansion,expandedCourseContent} from '../src/course-expansion-content.js';
import {courseVoicePath} from '../src/course-voice-path.js';

export async function prepareCourseAudioJobs(){
 const jobs=new Map(),packs={};
 for(const lesson of courseExpansionCatalog){
  await prepareCourseExpansion(lesson.id);
  for(const direction of lesson.directions||['ko-ja','ja-ko']){
   const c=expandedCourseContent(direction,lesson.id),locale=direction==='ko-ja'?'ja-JP':'ko-KR';
   const files=new Set();
   if(!c||c.items.length!==lesson.count)throw Error(`Incomplete lesson: ${direction}:${lesson.id}`);
   for(const x of c.items)for(const text of [x.text,x.answer,...x.others,...x.transfer.options]){
    if(typeof text!=='string'||!text.trim()||text.includes('|'))throw Error(`Invalid spoken text: ${direction}:${lesson.id}`);
    const file=courseVoicePath(locale,text),previous=jobs.get(file);
    if(previous&&(previous.text!==text||previous.locale!==locale))throw Error(`Voice identity collision: ${file}`);
    jobs.set(file,{file,text,locale});files.add(file);
   }
   packs[`${direction}:scenario:${lesson.id}`]={title:lesson.titles[direction==='ja-ko'?1:0],files:[...files]};
  }
 }
 return {jobs:[...jobs.values()],packs};
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const {jobs,packs}=await prepareCourseAudioJobs();
 const out=new URL('../output/course-expansion-voices/',import.meta.url);
 const serialized={jobs:JSON.stringify(jobs,null,2)+'\n',packs:JSON.stringify(packs,null,2)+'\n'};
 if(process.argv.includes('--verify')){
  for(const [name,value] of Object.entries(serialized))if(await readFile(new URL(`${name}.json`,out),'utf8')!==value)throw Error(`${name}.json is stale; regenerate speech jobs before installing clips.`);
 }else{
  await mkdir(out,{recursive:true});
  for(const [name,value] of Object.entries(serialized))await writeFile(new URL(`${name}.json`,out),value);
 }
 console.log(JSON.stringify({clips:jobs.length,lessons:Object.keys(packs).length,jobsSha256:createHash('sha256').update(serialized.jobs).digest('hex'),output:out.pathname}));
}
