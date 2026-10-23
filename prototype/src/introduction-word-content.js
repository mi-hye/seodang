import {expandedReviewWords} from './level-two-review-content.js';
// Independent word audio: never substitute a full sentence for a tapped word.
const wordPairs=[['学生','학생'],['コーヒー','커피'],['明日','내일'],['水','물']];
// Keep the recorded audio transcript; the Japanese window label uses 窓 with its reading.
const bagWordPairs=[['かばん','가방'],['まど','창문'],['ドア','문'],['コーヒー','커피']];
export function introductionWords(japaneseUI,bag=false){
 const lang=japaneseUI?'ko':'ja';
 const pictures=bag?['bag','window','door','coffee']:['student','coffee','tomorrow','water'];
 const pairs=bag?bagWordPairs:wordPairs;
 return pairs.map((pair,i)=>({picture:`assets/word-pictures/${pictures[i]}.svg`,text:bag&&!japaneseUI&&i===1?'窓':pair[japaneseUI?1:0],...(bag&&!japaneseUI&&i===1?{kanaReading:'まど'}:{}),meaning:pair[japaneseUI?0:1],audio:{text:pair[japaneseUI?1:0],locale:japaneseUI?'ko-KR':'ja-JP',status:'ready',audioFile:bag?(i===3?`assets/audio/review-words/${lang}.1.wav`:i===2?(japaneseUI?'assets/audio/korean/korean.1-9.3.wav':'assets/audio/bag-review-words/ja.door.v2.wav'):`assets/audio/bag-review-words/${lang}.${i}.wav`):i===3?(japaneseUI?'assets/audio/korean/korean.1-9.4.wav':'assets/audio/basics/basic.7.5.wav'):`assets/audio/review-words/${lang}.${i}.wav`}}));
}
export function introductionWordReview(japaneseUI,bag=false){
 const words=introductionWords(japaneseUI,bag),orders=[[1,0,3,2],[2,3,1,0],[0,1,3,2]];
 return words.slice(0,3).map((unit,index)=>({review:true,type:'word',stage:-1,stageIndex:index,unitIndex:index,unit,scene:unit.meaning,prompt:unit.meaning,hint:unit.meaning,options:orders[index].map(i=>words[i].text),optionPictures:orders[index].map(i=>words[i].picture),optionLabels:orders[index].map(i=>words[i].meaning),optionAudio:orders[index].map(i=>words[i].audio),answer:orders[index].indexOf(index)}));
}

export function lessonReviewWords(key){
 if(!['ko-ja:sentence:3','ja-ko:korean:3-1','ko-ja:sentence:0','ja-ko:korean:3-4'].includes(key))return expandedReviewWords(key);
 return introductionWords(key.startsWith('ja-ko:'),key==='ko-ja:sentence:0'||key==='ja-ko:korean:3-4');
}
