// Build a public-only Pages artifact. Internal Markdown, SQL and app data stay in the repository.
import {mkdir,readdir,copyFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const destination=resolve(process.argv[2]||join(root,'dist/public-site'));
await mkdir(destination,{recursive:true});
// A fresh directory prevents files from an older or broader build entering the artifact.
if((await readdir(destination)).length)throw Error('Public site output must be an empty staging directory.');

for(const name of ['privacy-policy.html','privacy-policy-legacy.html','third-party-notices.html']){
 await copyFile(join(root,'docs',name),join(destination,name));
}
await promisify(execFile)(process.execPath,[join(root,'scripts/build-share-quiz.mjs'),destination]);
