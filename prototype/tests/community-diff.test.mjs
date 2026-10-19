import test from 'node:test';
import assert from 'node:assert/strict';
import {correctionDiff,correctedSentencePair} from '../src/community-diff.js';
for(const [original,corrected] of [
 ['오늘은 커피를 먹었어요. 내일 만나요.','어제는 차를 마셨어요. 내일 만나요.'],
 ['昨日コーヒーを食べました。','昨日コーヒーを飲みました。'],
 ['👩‍👩‍👧‍👦와 가요','👩‍👩‍👧‍👦와 함께 가요'],['같아요','같아요'],['','추가'],['삭제',''],['<img>','<script>']
])test(`reconstruct correction: ${original}`,()=>{
 const parts=correctionDiff(original,corrected);
 assert.equal(parts.filter(p=>p.type!=='added').map(p=>p.text).join(''),original);
 assert.equal(parts.filter(p=>p.type!=='removed').map(p=>p.text).join(''),corrected);
 if(original===corrected)assert(parts.every(p=>p.type==='same'));
});
test('separate changes retain unchanged middle text',()=>{
 assert.deepEqual(correctionDiff('A coffee B tea C','X coffee B milk C'),[
 {type:'removed',text:'A'},{type:'added',text:'X'},{type:'same',text:' coffee B '},{type:'removed',text:'tea'},{type:'added',text:'milk'},{type:'same',text:' C'}]);
});

for(const [before,after,language,expected] of [
 ['안녕! 커피를 먹었어요. 내일 봐요.','안녕! 커피를 마셨어요. 내일 봐요.','ko',{original:'커피를 먹었어요.',corrected:'커피를 마셨어요.'}],
 ['커피를 먹었어요. 내일 봐요.','차를 마셨어요. 내일 봐요.','ko',{original:'커피를 먹었어요.',corrected:'차를 마셨어요.'}],
 ['안녕! 내일 봐.','안녕! 내일 봐요.','ko',{original:'내일 봐.',corrected:'내일 봐요.'}],
 ['こんにちは。コーヒーを食べました。またね。','こんにちは。コーヒーを飲みました。またね。','ja',{original:'コーヒーを食べました。',corrected:'コーヒーを飲みました。'}],
 ['안녕!','안녕!','ko',{original:'',corrected:''}],
 ['안녕! 커피를 마셨어요. 내일 봐요.','안녕! 커피를 마셨어요! 맛있어요. 내일 봐요.','ko',{original:'커피를 마셨어요.',corrected:'커피를 마셨어요! 맛있어요.'}]
])test(`show only edited sentence: ${before}`,()=>assert.deepEqual(correctedSentencePair(before,after,language),expected));
