import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
const source='node_modules/@rive-app/canvas-lite';
const {version}=JSON.parse(await readFile(`${source}/package.json`,'utf8'));
if(version!=='2.44.2')throw Error('Review Rive API and file compatibility before upgrading');
await mkdir('assets/vendor/rive',{recursive:true});
for(const file of ['rive.js','rive.wasm'])await copyFile(`${source}/${file}`,`assets/vendor/rive/${file}`);
await writeFile('assets/vendor/rive/version.json',JSON.stringify({package:'@rive-app/canvas-lite',version})+'\n');
