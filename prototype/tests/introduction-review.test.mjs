import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,reduce} from '../src/engine.js';
import {prepareContent,caseTasks,practiceKey,practiceUnits,interceptCompletion} from '../src/practice-content.js';
import {normalizeCasePractice,advancePractice,expressionReviewCount} from '../src/practice-state.js';
import {load,valid} from '../src/storage.js';
import {freshSentence,sentenceProgress} from '../src/sentence-state.js';
import {freshKoreanProgress} from '../src/korean-state.js';
import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../assets/audio/catalog.json',import.meta.url)));
for(const direction of ['ko-ja','ja-ko'])test(`${direction} 2-1 reviews every expression three ways and completes only after all 21`,async()=>{
 const kind=direction==='ko-ja'?'sentence':'korean';await prepareContent(kind);
 const s={...freshState(),courseDirection:direction,onboardingLevel:2,sentenceActive:3,sentenceLessons:{3:{...freshSentence(),started:true,index:5,phase:'speak'}},korean:{version:4,active:'3-1',lessons:{'3-1':{...freshKoreanProgress('3-1'),started:true,index:5,phase:'speak'}}}};
 const key=practiceKey(s,kind),tasks=caseTasks(s,kind),units=practiceUnits(s,kind),action={type:kind+'-speak-next'};
 assert.equal(tasks.length,21);assert.equal(expressionReviewCount(key),tasks.length);
 for(let stage=0;stage<3;stage++)assert.deepEqual(tasks.filter(t=>t.stage===stage).map(t=>t.unitIndex).sort(),[0,1,2,3,4,5]);
 for(const t of tasks){assert.equal(catalog.files[t.unit.audio.audioFile].text,t.unit.audio.text);if(t.type==='listen')assert.equal(t.options[t.answer],t.unit.meaning);if(t.stage===1){assert.equal(t.tokens.slice(0,t.answerLength).join(direction==='ja-ko'?' ':''),t.unit.text);assert.equal(t.tokens.length,t.answerLength+1);assert.equal(new Set(t.tokenOrder).size,t.tokens.length);}for(const a of t.optionAudio||[])if(a)assert.equal(catalog.files[a.audioFile].text,a.text);}
 const pending=interceptCompletion(s,reduce(s,action),kind,action);let p=pending.practices[key];assert.equal(p.count,21);assert.equal(p.caseVersion,3);assert.deepEqual(pending.history,s.history);assert.deepEqual(pending.korean.history,s.korean.history);
 for(let i=0;i<21;i++){assert.equal(p.index,i);assert.ok(valid({...pending,practices:{[key]:p}}));assert.equal(load({getItem:()=>JSON.stringify({...pending,practices:{[key]:p}})}).state.practices[key].index,i);p=advancePractice(p,1,false);if(i<20)assert.ok(p);}
 assert.equal(p,null);const done=reduce({...pending,practices:{}},action);assert.equal(kind==='sentence'?sentenceProgress(done).phase:done.korean.lessons['3-1'].phase,kind==='sentence'?'summary':'done');
 for(const old of [{caseVersion:1,count:6},{caseVersion:2,count:6},{caseVersion:2,count:18}]){const p={...pending.practices[key],...old,index:4};assert.deepEqual(normalizeCasePractice(p,key),{...p,caseVersion:3,count:21,index:0});}
});
test('2-4 now uses twelve review tasks and completed 2-1 keeps its history',async()=>{
 await prepareContent('sentence');const s={...freshState(),onboarded:true,onboardingLevel:2,sentenceActive:1,sentenceLessons:{3:{...freshSentence(),started:true,completed:true,phase:'summary',index:5}}};assert.equal(caseTasks(s,'sentence').length,12);const restored=load({getItem:()=>JSON.stringify(s)});assert.equal(restored.blocked,false);assert.equal(restored.state.sentenceLessons[3].completed,true);assert.deepEqual(restored.state.history,s.history);
});
for(const direction of ['ko-ja','ja-ko'])test(`${direction} 2-2 has twelve source-backed review tasks and migrates pending progress`,async()=>{
 const kind=direction==='ko-ja'?'sentence':'korean';await prepareContent(kind);
 const s={...freshState(),courseDirection:direction,onboardingLevel:2,sentenceActive:0,sentence:{...freshSentence(),started:true,index:2,phase:'solve',selected:'window-blue'},korean:{version:4,active:'3-4',lessons:{'3-4':{...freshKoreanProgress('3-4'),started:true,index:2,phase:'speak',caseSeen:true}}}};
 const tasks=caseTasks(s,kind),key=practiceKey(s,kind),action={type:kind==='sentence'?'sentence-submit':'korean-speak-next'};assert.equal(tasks.length,12);assert.equal(expressionReviewCount(key),tasks.length);
 for(const stage of [0,1])assert.deepEqual(tasks.filter(t=>t.stage===stage).map(t=>t.unitIndex).sort(),[0,1,2]);
 for(const t of tasks){assert.equal(catalog.files[t.unit.audio.audioFile].text,t.unit.audio.text);if(t.type==='listen'){assert.equal(t.options[t.answer],t.unit.meaning);assert.equal(new Set(t.options).size,3);}if(t.stage===1){assert.equal(t.tokens.slice(0,t.answerLength).join(' '),t.unit.text);assert.equal(new Set(t.tokens).size,t.tokens.length);assert.equal(new Set(t.tokenOrder).size,t.tokens.length);}}
 assert.equal(tasks[10].unitIndex,direction==='ko-ja'?0:1);
 const pending=interceptCompletion(s,reduce(s,action),kind,action);assert.equal(pending.practices[key].count,12);assert.deepEqual(pending.history,s.history);
 const old={...pending.practices[key],caseVersion:1,count:3,index:2};assert.equal(normalizeCasePractice(old,key).count,12);assert.equal(normalizeCasePractice(old,key).index,0);assert.equal(normalizeCasePractice({...old,caseVersion:2,count:9,index:8},key).caseVersion,3);
 let p=pending.practices[key];for(let i=0;i<12;i++){assert.equal(p.index,i);assert.ok(valid({...pending,practices:{[key]:p}}));p=advancePractice(p,1,false);}assert.equal(p,null);
 const done=reduce({...pending,practices:{}},action);assert.equal(kind==='sentence'?done.sentence.completed:done.korean.lessons['3-4'].completed,true);
});
test('2-1 and 2-2 picture choices have exact isolated audio in both offline packs',async()=>{
 const {introductionWordReview}=await import('../src/introduction-word-content.js');
 for(const ui of [false,true])for(const bag of [false,true]){const key=bag?(ui?'ja-ko:korean:3-4':'ko-ja:sentence:0'):(ui?'ja-ko:korean:3-1':'ko-ja:sentence:3');const words=introductionWordReview(ui,bag);assert.equal(words.length,3);if(bag&&!ui){assert.equal(words[2].unit.text,'ドア');assert.equal(words[2].unit.audio.audioFile,'assets/audio/bag-review-words/ja.door.v2.wav');}assert.deepEqual(words.map(t=>t.answer).sort(),[1,2,3]);
  for(const t of words){assert.equal(t.type,'word');assert.equal(t.options.length,4);assert.equal(new Set(t.optionPictures).size,4);assert.equal(t.options[t.answer],t.unit.text);for(let i=0;i<t.options.length;i++){const a=t.optionAudio[i];assert.equal(a.text,t.options[i]==='窓'?'まど':t.options[i]);assert.equal(catalog.files[a.audioFile].text,a.text);assert.ok(catalog.packs[key].files.includes(a.audioFile));}}
 }
});

// Orthographic updates must retain saved token indices and the verified audio catalog.
test('Japanese 2-2 uses the same notation in lesson, vocabulary and every review stage',async()=>{
 const {sentences,sentenceWords,sentenceAudio}=await import('../src/sentence-content.js');
 const {introductionWords}=await import('../src/introduction-word-content.js');
 assert.deepEqual(sentences.map(x=>x.text),['これは 私の かばんです。','かばんは 窓の そばに あります。','赤い かばんでは ありません。']);
 assert.deepEqual(sentences.map(x=>x.parts.length),[3,3,2]);
 for(const x of sentences){assert.equal(x.parts.map(([t])=>t).join(' '),x.text);assert.ok(x.kanaReading);assert.equal(sentenceAudio[x.id].text,catalog.files[sentenceAudio[x.id].audioFile].text);}
 assert.deepEqual(sentenceWords[1].map(([t])=>t),['かばん','窓','そば']);
 const word=introductionWords(false,true)[1];assert.equal(word.text,'窓');assert.equal(word.kanaReading,'まど');assert.equal(word.audio.text,'まど');
 assert.equal(introductionWords(true,true)[1].text,'창문');assert.equal(introductionWords(true,true)[1].meaning,'まど');
 await prepareContent('sentence');const s={...freshState(),courseDirection:'ko-ja',onboardingLevel:2,sentenceActive:0};
 const tasks=caseTasks(s,'sentence');
 assert.deepEqual(tasks[9].tokens,['これは','私の','かばんです。']);
 assert.ok(tasks[10].prompt.includes('私の'));assert.ok(tasks[10].options.includes('窓'));
 assert.ok(tasks[11].scene.includes('窓'));assert.ok(tasks[11].scene.includes('赤い'));
 for(const x of tasks.filter(t=>t.stage===1))assert.equal(x.tokens.slice(0,x.answerLength).join(' '),x.unit.text);
});
