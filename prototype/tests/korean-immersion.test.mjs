import test from 'node:test';import assert from 'node:assert/strict';
import {freshState} from '../src/engine.js';import {freshKoreanProgress} from '../src/korean-state.js';
import {setUILanguage,isJapaneseUI,loadUILanguage} from '../src/i18n.js';
import {renderKorean} from '../src/korean.js';import {renderLearningMap} from '../src/learning-map.js';import {renderPanel} from '../src/panels.js';import {renderHeader} from '../src/header.js';import {progressBar} from '../src/lesson-session.js';
import {prepareContent,caseTasks} from '../src/practice-content.js';import {renderCasePractice} from '../src/case-practice.js';import {renderPracticeComplete} from '../src/practice.js';
const noJapanese=html=>assert.doesNotMatch(html,/[ぁ-ゖァ-ヺ一-龯]/u);
test('Korean level 5 keeps Japanese interface and original Korean learning content',async()=>{
 const s={...freshState(),courseDirection:'ja-ko',onboardingLevel:7,korean:{version:4,active:'7-1',lessons:{'7-1':freshKoreanProgress('7-1')}}};
 await loadUILanguage(s);setUILanguage(s);assert.equal(isJapaneseUI(),true);
 for(const index of [0,1,2])for(const phase of ['scenario','learn','quiz']){s.korean.lessons['7-1']={...freshKoreanProgress('7-1'),index,phase,retry:true};const html=renderKorean(s,renderHeader);noJapanese(html.replace(/<header[\s\S]*?<\/header>/,'').replace(/<dd lang="ja">[^<]*<\/dd>/g,''));if(phase==='learn'){const meanings=[...html.matchAll(/<dd lang="ja">([^<]*)<\/dd>/g)].map(m=>m[1]);assert.equal(meanings.length,3);for(const meaning of meanings)assert.match(meaning,/^[一-龯]+$/u);}}
 assert.match(renderLearningMap(s),/考えを伝える/);assert.match(renderPanel('settings',s,'learning'),/文字/);assert.match(progressBar(s,'korean'),/学習の進み具合/);assert.match(renderPracticeComplete(s,renderHeader,false),/学習が完了しました/);
 await prepareContent('korean');const tasks=caseTasks(s,'korean');for(const [index,task] of tasks.entries()){noJapanese(JSON.stringify(task));assert.ok(renderCasePractice(s,task,{index,count:tasks.length},renderHeader));}
 setUILanguage({...s,onboardingLevel:5});assert.equal(isJapaneseUI(),true);
 setUILanguage({...s,courseDirection:'ko-ja'});assert.equal(isJapaneseUI(),false);
});
