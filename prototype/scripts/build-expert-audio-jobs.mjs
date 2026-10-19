import {readFile,writeFile,mkdir} from 'node:fs/promises';
const content=JSON.parse(await readFile('src/expert-content.json','utf8')),jobs=[],packs={};
for(const [direction,articles]of Object.entries(content))articles.forEach((article,id)=>{
 if(article.audio.audioFile.startsWith('assets/audio/expert/'))jobs.push({file:article.audio.audioFile,text:article.audio.text,locale:article.audio.locale});
 for(const sentence of article.sentences)jobs.push({file:sentence.audioFile,text:sentence.text,locale:article.audio.locale});
 const discussionLines=article.discussion?[...article.discussion.perspectives,...article.discussion.expressions]:null;
 if(discussionLines)for(const line of discussionLines)jobs.push({file:line.audioFile,text:line.text,locale:article.audio.locale});
 packs[`${direction}:expert:${id}`]={title:article.title,level:7,files:discussionLines?discussionLines.map(s=>s.audioFile):[article.audio.audioFile,...article.sentences.map(s=>s.audioFile)]};
});
await mkdir('output/expert-voices',{recursive:true});await writeFile('output/expert-voices/jobs.json',JSON.stringify(jobs,null,2));await writeFile('output/expert-voices/packs.json',JSON.stringify(packs,null,2));
console.log(`${jobs.length} new clips; ${Object.keys(packs).length} article packs`);
