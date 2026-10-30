import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {particleCourseContent} from '../src/particle-course-content.js';
import {courseVoicePath} from '../src/course-voice-path.js';

export function prepareComparisonAudioJobs(content){
 const jobs=new Map(),packs={};
 for(const [id,units] of Object.entries(content)){
  const files=new Set();
  for(const unit of units)for(const item of [...unit.examples,unit.question]){
   const {text}=item;
   if(typeof text!=='string'||!text.trim()||text.includes('|'))throw Error(`Invalid spoken sentence: ${id}`);
   const file=courseVoicePath('ko-KR',text),previous=jobs.get(file);
   if(previous&&previous.text!==text)throw Error(`Voice identity collision: ${file}`);
   if(item.audio?.audioFile!==file||item.audio?.text!==text)throw Error(`Sentence/audio mismatch: ${id}: ${text}`);
   jobs.set(file,{file,text,locale:'ko-KR'});files.add(file);
  }
  packs[id]={files:[...files]};
 }
 return {jobs:[...jobs.values()],packs};
}

export const prepareParticleAudioJobs=()=>prepareComparisonAudioJobs(particleCourseContent);

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const {jobs,packs}=prepareParticleAudioJobs();
 const out=new URL('../output/particle-voices/',import.meta.url);
 await mkdir(out,{recursive:true});
 for(const [name,data] of Object.entries({jobs,packs})){
  const value=JSON.stringify(data,null,2)+'\n';
  if(process.argv.includes('--verify')){
   if(await readFile(new URL(`${name}.json`,out),'utf8')!==value)throw Error(`${name}.json is stale`);
  }else await writeFile(new URL(`${name}.json`,out),value);
 }
 console.log(JSON.stringify({clips:jobs.length,lessons:Object.keys(packs).length,output:out.pathname}));
}
