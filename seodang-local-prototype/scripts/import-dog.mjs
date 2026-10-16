// Explicit maintenance command; the generated asset is self-contained at runtime.
import { getDogSprite } from '../../src/domain/pet/pixelDog.ts';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const original=getDogSprite(1,false);
const groups={body:[],head:[],leftEye:[],rightEye:[],mouth:[],tail:original.tail};
const byGroup={body:new Map(),head:new Map(),leftEye:new Map(),rightEye:new Map(),mouth:new Map()};
for(const path of original.body){
 for(const m of path.d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)){
  const [,sx,sy,sw]=m; const x=Number(sx),y=Number(sy),w=Number(sw);
  for(let px=x;px<x+w;px++){
   let group=y>=15?'body':'head';
   if(y>=9&&y<11&&px>=5&&px<7)group='leftEye';
   if(y>=9&&y<11&&px>=13&&px<15)group='rightEye';
   if(y>=13&&y<15&&px>=8&&px<11)group='mouth';
   const current=byGroup[group].get(path.color)??'';
   byGroup[group].set(path.color,current+`M${px} ${y}h1v1h-1z`);
  }
 }
}
for(const group of Object.keys(byGroup)) groups[group]=[...byGroup[group]].map(([color,d])=>({color,d}));
writeFileSync('src/character/assets/seodang-dog.json',JSON.stringify({resolution:original.resolution,...groups},null,2)+'\n');
const source='src/domain/pet/pixelDog.ts';
writeFileSync('src/character/assets/PROVENANCE.md',`# 서당개 에셋 출처\n\n기존 서당 앱의 \`${source}\`에 있는 \`getDogSprite(1, false)\` 출력을 사용합니다. \`src/components/learning/LearningStartScreen.tsx\`에서 사용하는 기본 단계(24px)와 같습니다.\n\n원본 SHA-256: \`${createHash('sha256').update(readFileSync('../'+source)).digest('hex')}\`\n\n\`scripts/import-dog.mjs\`로 생성했습니다. 픽셀의 위치·색상을 바꾸지 않고 몸·머리·눈·입·꼬리 레이어로 분리했습니다. 웹 CSS 반응만 추가했습니다. 원본 파일은 수정하지 않았습니다. 생성된 JSON을 프로젝트 안에 포함하므로 다른 컴퓨터에서 실행할 때 부모 앱이 필요하지 않습니다. 재생성할 때만 원본 저장소가 필요합니다.\n`);
