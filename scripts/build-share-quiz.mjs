// Stage the same original quiz for the existing docs site; no app/user data copied.
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root=new URL('../',import.meta.url);
const destination=process.argv[2]?pathToFileURL(resolve(process.argv[2])+'/'):new URL('docs/',root);
await mkdir(new URL('quiz-assets/',destination),{recursive:true});
for(const file of ['share-quiz.js','share-quiz-content.js','share-quiz.css'])await copyFile(new URL(`prototype/src/${file}`,root),new URL(`quiz-assets/${file}`,destination));
const html=(await readFile(new URL('prototype/quiz.html',root),'utf8')).replaceAll('src/share-quiz','quiz-assets/share-quiz').replace(/<link rel="icon"[^>]+>/,'');
await writeFile(new URL('quiz.html',destination),html);
