import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {freshState,reduce} from '../src/engine.js';import {load,valid} from '../src/storage.js';
import {koreanLessons,koreanProgress,koreanUnlocked,validKorean,koreanQuizOnly} from '../src/korean-state.js';import {koreanContent} from '../src/korean-content.js';import {koreanAudio,renderKorean,composeKorean} from '../src/korean.js';import {setUILanguage,loadUILanguage,t} from '../src/i18n.js';
test('Korean course progresses through all 17 lessons with isolated records, retries and valid saves',()=>{
 let s=reduce({...freshState(),onboarded:true,onboardingLevel:3},{type:'course',value:'ja-ko'});const original=structuredClone(s.episode);
 assert.equal(s.onboardingLevel,0);assert.equal(koreanUnlocked(s,'1-2'),true);
 for(const lesson of koreanLessons){s=reduce(s,{type:'level',value:lesson.level});s=reduce(s,{type:'korean-start',id:lesson.id});assert.equal(koreanContent[lesson.id].length,lesson.count);
  for(let index=0;index<lesson.count;index++){
   const item=koreanContent[lesson.id][index];assert.equal(new Set([item.answer||item.text,...item.others]).size,3);
   if(lesson.level===0&&!lesson.practice){if(koreanProgress(s,lesson.id).phase==='intro')s=reduce(s,{type:'korean-next'});assert.equal(koreanProgress(s,lesson.id).phase,'learn');s=reduce(s,{type:'korean-next'});assert.ok(valid(s));continue;}
   while(koreanProgress(s,lesson.id).phase!=='quiz')s=reduce(s,{type:'korean-next'});
   s=reduce(s,{type:'korean-select',id:String((index+1)%(lesson.level===0?4:3))});s=reduce(s,{type:'korean-check'});assert.equal(koreanProgress(s,lesson.id).index,index);assert.equal(koreanProgress(s,lesson.id).retry,true);
   s=reduce(s,{type:'korean-select',id:String(index%(lesson.level===0?4:3))});s=reduce(s,{type:'korean-check'});assert.ok(valid(s));const restored=load({getItem:()=>JSON.stringify(s)});assert.equal(restored.blocked,false);s=restored.state;
  }
  assert.equal(koreanProgress(s,lesson.id).completed,true);
 }
 assert.deepEqual(s.episode,original);assert.equal(Object.values(s.korean.lessons).filter(p=>p.completed).length,17);assert.equal(Object.keys(s.history.days).length,0);assert.equal(Object.values(s.korean.history.days).reduce((sum,d)=>sum+d.cases,0),17);
 s=reduce(s,{type:'course',value:'ko-ja'});assert.equal(s.onboardingLevel,2);const progress=structuredClone(s.korean);s=reduce(s,{type:'course',value:'ja-ko'});assert.equal(s.onboardingLevel,7);assert.deepEqual(s.korean,progress);assert.ok(valid(s));
 assert.equal(validKorean({...s.korean,active:'1-99'}),false);assert.equal(valid({...s,courseDirection:'bad'}),false);
});
test('Korean audio uses bundled matching files and advanced passages stay hidden',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../assets/audio/korean/manifest.json',import.meta.url)));
 let count=0;
 for(const l of koreanLessons)for(let index=0;index<l.count;index++){
  const s={...freshState(),courseDirection:'ja-ko',onboardingLevel:l.level,korean:{active:l.id,lessons:{[l.id]:{index,phase:koreanQuizOnly(l)?'quiz':'learn',selected:null}}}},entry=koreanAudio(s),info=manifest.files[entry.id];
  assert.equal(entry.locale,'ko-KR');assert.equal(entry.status,'ready');assert.equal(info.spoken,entry.text);assert.equal(info.file,entry.audioFile);
  const wav=readFileSync(new URL('../'+entry.audioFile,import.meta.url));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(createHash('sha256').update(wav).digest('hex'),info.sha256);
  if(l.level===7){const markup=renderKorean(s,()=> '');assert.ok(markup.includes('korean-passage'));assert.ok(markup.replace(/<[^>]*>/g,'').includes(koreanContent[l.id][index].text));}
  count++;
 }
 assert.equal(count,Object.keys(manifest.files).length);
});
test('interface localization switches both directions without changing learning text',async()=>{await loadUILanguage({courseDirection:'ja-ko'});setUILanguage({courseDirection:'ja-ko'});assert.equal(t('내 기록'),'学習記録');assert.equal(t('정말 삭제하시겠습니까?'),'本当に削除しますか？');setUILanguage({courseDirection:'ko-ja'});assert.equal(t('내 기록'),'내 기록');});

test('letter learning alternates with composition using only previously learned components',()=>{
 const known=new Set();
 for(const lesson of koreanLessons.filter(l=>l.level===0)){
  assert.equal(Boolean(lesson.practice),Number(lesson.id.split('-')[1])%2===0);
  for(const item of koreanContent[lesson.id]){
   if(!lesson.practice){if(item.text.length===1&&item.text.charCodeAt(0)<0xac00)known.add(item.text);continue;}
   assert.equal(composeKorean(item.parts),item.text);
   for(const part of [...item.parts,...item.others])assert.ok(known.has(part),`${lesson.id}: ${part}`);
   const s={...freshState(),korean:{version:2,active:lesson.id,lessons:{[lesson.id]:{index:0,phase:'quiz',selected:null}}}};
   assert.ok(renderKorean(s,()=> '').includes('korean-assembly'));
  }
 }
 assert.equal(known.size,40);
});
test('old Korean saves retain history and higher levels without reusing unrelated letter progress',()=>{
 const progress={index:10,phase:'learn',selected:null,retry:false,started:true,completed:false};
 const old={...freshState(),korean:{version:1,active:'1-6',lessons:{'1-6':progress,'2-1':{...progress,index:2}}}};
 const result=load({getItem:()=>JSON.stringify(old)});assert.equal(result.blocked,false);assert.equal(result.state.korean.version,4);assert.equal(result.state.korean.active,'1-1');assert.deepEqual(result.state.korean.legacyLetters['1-6'],progress);assert.equal(result.state.korean.lessons['2-1'].index,2);assert.equal(result.state.korean.lessons['1-6'],undefined);assert.ok(valid(result.state));
});
