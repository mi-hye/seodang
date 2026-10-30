import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {endingCourseContent} from '../src/ending-course-content.js';
import {prepareComparisonAudioJobs} from './prepare-particle-audio.mjs';
export const prepareEndingAudioJobs=()=>prepareComparisonAudioJobs(endingCourseContent);
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const {jobs,packs}=prepareEndingAudioJobs(),out=new URL('../output/ending-voices/',import.meta.url);
 await mkdir(out,{recursive:true});
 for(const [name,data] of Object.entries({jobs,packs})){
  const value=JSON.stringify(data,null,2)+'\n',file=new URL(`${name}.json`,out);
  if(process.argv.includes('--verify')){if(await readFile(file,'utf8')!==value)throw Error(`${name}.json is stale`);}
  else await writeFile(file,value);
 }
 console.log(JSON.stringify({clips:jobs.length,lessons:Object.keys(packs).length,output:out.pathname}));
}
