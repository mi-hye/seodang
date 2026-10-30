import {courseVoicePath} from './course-voice-path.js';
// NIKL Standard Pronunciation §§9–11. These are word-specific realizations,
// not a universal rule for each written cluster (e.g. 밟다 differs from 여덟).
const rows=[
 ['국','ㄱ','ㄱ','국','スープ','舌の奥をつけたまま、息を止めよう。',['ㄴ','ㅁ']],
 ['옷','ㅅ','ㄷ','옫','服','単独で読む옷のㅅは、舌先で止めるㄷの音になるよ。',['ㄹ','ㅂ']],
 ['넋','ㄳ','ㄱ','넉','魂','単独で読む넋では、ㄳのうちㄱの音だけを残すよ。',['ㄴ','ㅁ']],
 ['앉다','ㄵ','ㄴ','안따','座る','앉のㄵはㄴの音になるよ。この単語の다は、따と発音するよ。',['ㄱ','ㅂ']],
 ['닭','ㄺ','ㄱ','닥','鶏','単独で読む닭では、ㄺのうちㄱの音だけを残すよ。',['ㄹ','ㅇ']],
 ['여덟','ㄼ','ㄹ','여덜','八つ・8','この単語のㄼはㄹの音。舌先をつけ、舌の横から音を通そう。',['ㄴ','ㅂ']],
 ['삶','ㄻ','ㅁ','삼','人生・暮らし','単独で読む삶では、ㄻのうちㅁの音だけを残すよ。',['ㄹ','ㅇ']],
 ['값','ㅄ','ㅂ','갑','値段','単独で読む값では、ㅄのうちㅂの音だけを残すよ。',['ㄱ','ㅁ']]
];
// Short linking examples: Standard Pronunciation §14; length marks omitted as in the course.
const connected={넋:'넋이 [넉씨]',앉다:'앉아 [안자]',닭:'닭이 [달기]',여덟:'여덟이 [여덜비]',삶:'삶이 [살미]',값:'값이 [갑씨]'};
export const batchimExpansion=rows.map(([text,glyph,finalSound,reading,meaning,cue,others],i)=>({text,spoken:text,glyph,finalSound,reading,meaning,cue,connectionNote:connected[text]?`後ろにつながると、${connected[text]}。`:'',others,answer:finalSound,finalSoundPractice:true,audio:{id:`batchim.${text}`,text,locale:'ko-KR',status:'ready',audioFile:i<2?`assets/audio/korean-pronunciation/${text.codePointAt(0).toString(16)}.wav`:courseVoicePath('ko-KR',text),...(i>=2?{bundled:true}:{}),voiceId:'Supertonic 3 M1'}}));
export const batchimWord=text=>batchimExpansion.find(item=>item.text===text);
