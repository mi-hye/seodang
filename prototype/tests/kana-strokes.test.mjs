import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {kanaLetters} from '../src/kana-state.js';
test('all 46 letters have ordered KanjiVG stroke geometry and original source attribution',()=>{
 const data=JSON.parse(readFileSync('assets/strokes/data.json')),source=JSON.parse(readFileSync('assets/strokes/sources.json'));
 assert.equal(Object.keys(data).length,46);assert.equal(source.files.length,46);
 for(const {text}of kanaLetters){const d=data[text];assert.ok(d.paths.length>0);assert.deepEqual(d.numbers.map(x=>Number(x.text)),d.paths.map((_,i)=>i+1));const original=readFileSync(`assets/strokes/${text.codePointAt(0).toString(16).padStart(5,'0')}.svg`,'utf8');for(const path of d.paths)assert.ok(original.includes(path));assert.match(original,/Ulrich Apel/);}
 assert.equal(data['あ'].paths.length,3);assert.equal(data['お'].paths.length,3);assert.equal(data['い'].paths.length,2);
 assert.match(readFileSync('assets/strokes/NOTICE.txt','utf8'),/CC BY-SA 3.0/);
});
