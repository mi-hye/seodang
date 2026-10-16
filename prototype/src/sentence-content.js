import {extraSentenceCases,levelTwoAudio} from './level-two-content.js';
import {sentenceId} from './sentence-state.js';
// Level 3 case and lesson order are provisional, editable learning content.
export const sentenceCase = {id:'cafe-owner',title:'카페에 남겨진 가방',image:'assets/cafe-dusk-v2.jpg'};
export const sentences = [
  {id:'owner', text:'これは わたしの かばんです。', spoken:'これは私の鞄です。', meaning:'이것은 제 가방입니다.', reading:'kore wa watashi no kaban desu', help:'これは로 대상을 가리키고, わたしの로 누구의 것인지 말해요.', image:'assets/word-blue-bag-v1.png',alt:'파란 가방',parts:[['これは','이것은'],['わたしの','제'],['かばんです。','가방입니다']],order:[2,0,1]},
  {id:'location',text:'かばんは まどの そばに あります。',spoken:'鞄は窓のそばにあります。',meaning:'가방은 창문 옆에 있습니다.',reading:'kaban wa mado no soba ni arimasu',help:'장소 뒤에 に あります를 붙이면 물건이 어디에 있는지 말할 수 있어요.',image:'assets/word-near-window-v1.png',alt:'창문 옆에 놓인 가방',parts:[['かばんは','가방은'],['まどの そばに','창문 옆에'],['あります。','있습니다']],order:[1,2,0]},
  {id:'not-red',text:'あかい かばんでは ありません。',spoken:'赤い鞄ではありません。',meaning:'빨간 가방이 아닙니다.',reading:'akai kaban dewa arimasen',help:'では ありません은 “~이 아닙니다”라는 뜻이에요.',parts:[['あかい かばんでは','빨간 가방이'],['ありません。','아닙니다']],order:[1,0]},
];
export const sentenceAudio = Object.fromEntries([
  ['intro','わたしの鞄を探しています。窓のそばにあります。赤い鞄ではありません。'],
  ...sentences.map(s=>[s.id,s.spoken]),
].map(([id,text])=>[id,{id:`level3.${id}.ja`,text,locale:'ja-JP',playbackRate:0.8,audioFile:`assets/audio/sentences/level3.${id}.ja.wav`,status:'ready',voiceId:'VOICEVOX Nemo 男声1',productionMethod:'Selected offline TTS',languageReviewed:false}]));

export const sentenceWords=[[['これ','이것'],['わたし','나'],['かばん','가방']],[['かばん','가방'],['まど','창문'],['そば','옆']],[['あかい','빨간'],['かばん','가방']]];

export function sentenceCourse(s){const id=sentenceId(s);return id===0?{...sentenceCase,sentences,words:sentenceWords,audio:sentenceAudio}:extraSentenceCases[id];}
for(const [id,lesson] of Object.entries(extraSentenceCases)){
 lesson.words=lesson.sentences.map(x=>x.words);
 lesson.audio={intro:levelTwoAudio(`sentence.${id}.intro`,lesson.intro,'ja-JP'),...Object.fromEntries(lesson.sentences.map(x=>[x.id,levelTwoAudio(x.id,x.spoken,'ja-JP')]))};
}
