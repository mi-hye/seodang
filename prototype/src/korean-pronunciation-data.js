import {batchimWord} from './batchim-expansion-content.js';
// Schematic teaching positions, not measured vocal-tract contours.
// Sources: National Institute of Korean Language, Standard Pronunciation §§2–5, 8–9.
// https://m.korean.go.kr/front/page/pageView.do?mn_id=95&page_id=P000098
// https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=308835
// NIKL Korean teacher training: consonant place/manner and vowel glides.
// Modern ㅐ/ㅔ overlap; ㅚ/ㅟ use the permitted glide realization here.
export const vowelOrder='ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣㅐㅒㅔㅖㅘㅙㅚㅝㅞㅟㅢ';
export const consonantOrder='ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㄲㄸㅃㅆㅉ';
const vowels={
 'ㅏ':['a','아','口を開き、舌を低くする。','唇は丸めません。'],
 'ㅓ':['eo','어','舌の奥を中くらいの高さにする。','唇は丸めず、ㅗと聞き比べよう。'],
 'ㅗ':['o','오','舌の奥を持ち上げ、唇を丸める。','ㅓより唇を前に出します。'],
 'ㅜ':['u','우','舌の奥を高くし、唇を丸める。','唇を前に出し、口の出口を小さくします。'],
 'ㅡ':['eu','으','舌の奥を高くし、唇は丸めない。','日本語の「ウ」と同じとは限りません。'],
 'ㅣ':['i','이','舌の前を高くする。','舌を上あごにつけず、息の通り道を残します。'],
 'ㅐ':['ae','애','舌の前を少し低めにし、口を開く。','今の会話ではㅔとほぼ同じ音になることもあります。'],
 'ㅔ':['e','에','舌の前を中くらいの高さにする。','今の会話ではㅐとの違いが小さいこともあります。']
};
const glides={
 'ㅑ':['i','a','야','ㅣの構えから、すぐㅏへ。','二つに区切らず、一つの音にします。'],
 'ㅕ':['i','eo','여','ㅣの構えから、すぐㅓへ。','終わりでも唇は丸めません。'],
 'ㅛ':['i','o','요','ㅣの構えから、唇を丸めてㅗへ。','舌の前から奥へ、なめらかに移ります。'],
 'ㅠ':['i','u','유','ㅣの構えから、唇を丸めてㅜへ。','終わりは舌の奥を高くします。'],
 'ㅒ':['i','ae','얘','ㅣの構えから、すぐㅐへ。','ㅖとの音の違いが小さいこともあります。'],
 'ㅖ':['i','e','예','ㅣの構えから、すぐㅔへ。','ここでは単独の예の発音を練習します。'],
 'ㅘ':['u','a','와','唇を丸めた構えから、ㅏへ開く。','ㅗとㅏを別々に読まず、続けます。'],
 'ㅝ':['u','eo','워','唇を丸めた構えから、ㅓへ。','終わりでは唇の丸みをほどきます。'],
 'ㅙ':['u','ae','왜','唇を丸めた構えから、ㅐへ。','ㅚ・ㅞと近い音になることもあります。'],
 'ㅞ':['u','e','웨','唇を丸めた構えから、ㅔへ。','ㅙ・ㅚと聞き比べてみよう。'],
 'ㅚ':['u','e','외','唇を丸めた構えから、ㅔへ。','ここでは認められている二重母音の読み方を示します。'],
 'ㅟ':['u','i','위','唇を丸めた構えから、ㅣへ。','ここでは認められている二重母音の読み方を示します。'],
 'ㅢ':['eu','i','의','唇を丸めず、ㅡの構えからㅣへ。','語頭の의の練習です。位置や使い方で読み方が変わります。']
};
const records={};
for(const [glyph,[pose,sample,cue,note]] of Object.entries(vowels))records[glyph]={glyph,kind:'vowel',poses:[pose],sample,cue,note};
for(const [glyph,[start,end,sample,cue,note]] of Object.entries(glides))records[glyph]={glyph,kind:'glide',poses:[start,end],sample,cue,note};
const consonants={
 'ㄱ':['velar','가','舌の奥を上あごの奥につけ、離す。','平音：力を入れすぎず、가の音をまねします。'],
 'ㅋ':['velar','카','舌の奥をつけ、息と一緒に離す。','激音：口の前に息がはっきり出ます。'],
 'ㄲ':['velar','까','舌の奥をしっかりつけ、短く離す。','濃音：息を強く吹かず、出だしを引き締めます。'],
 'ㄷ':['alveolar','다','舌先を上の歯ぐきにつけ、離す。','平音：力を入れすぎず、다の音をまねします。'],
 'ㅌ':['alveolar','타','舌先をつけ、息と一緒に離す。','激音：口の前に息がはっきり出ます。'],
 'ㄸ':['alveolar','따','舌先をしっかりつけ、短く離す。','濃音：強い息ではなく、締まった出だしです。'],
 'ㅂ':['bilabial','바','両唇を閉じてから開く。','平音：力を入れすぎず、바の音をまねします。'],
 'ㅍ':['bilabial','파','両唇を閉じ、息と一緒に開く。','激音：口の前に息がはっきり出ます。'],
 'ㅃ':['bilabial','빠','両唇をしっかり閉じ、短く開く。','濃音：息を強く吹かず、出だしを引き締めます。'],
 'ㅈ':['palatal','자','舌の前を上あごの前寄りにつけ、こすりながら離す。','平音：日本語の「ザ」と同じとは限りません。'],
 'ㅊ':['palatal','차','舌の前をつけ、息と一緒にこすって離す。','激音：口の前に息がはっきり出ます。'],
 'ㅉ':['palatal','짜','舌の前をしっかりつけ、こすって離す。','濃音：強い息ではなく、締まった出だしです。'],
 'ㅅ':['sibilant','사','舌の前と上の歯ぐきの間を狭める。','息をこすって出します。ㅣの前では音が変わります。'],
 'ㅆ':['sibilant','싸','舌の前の狭いすき間を保ち、息をこする。','ㅅより引き締めた音です。大声にする必要はありません。'],
 'ㄴ':['alveolar','나','舌先を上の歯ぐきにつける。','口をふさぎ、鼻へ息を通します。'],
 'ㅁ':['bilabial','마','唇を軽く閉じ、鼻に音を響かせる。','すぐ口を開き、ㅏにつなげて마と言います。図はㅁを出すときの形です。'],
 'ㄹ':['tap','라','舌先で上の歯ぐきに一度、軽く触れる。','ここでは語頭の音です。舌先を長く押しつけないようにします。'],
 'ㅇ':['silent','아','母音の前のㅇは発音しない。','母音の音を、そのまま出します。'],
 'ㅎ':['glottal','하','口の中をふさがず、喉から息を出す。','舌を無理に動かさず、後ろの母音へつなげます。']
};
const contrasts=['ㄱㅋㄲ','ㄷㅌㄸ','ㅂㅍㅃ','ㅈㅊㅉ','ㅅㅆ','ㅓㅗ','ㅡㅜ','ㅐㅔ','ㅒㅖ','ㅙㅚㅞ'];
for(const [glyph,[pose,sample,cue,note]] of Object.entries(consonants))records[glyph]={glyph,kind:'consonant',poses:[pose],sample,cue,note,nasal:'ㄴㅁ'.includes(glyph),aspirated:'ㅋㅌㅍㅊ'.includes(glyph),tense:'ㄲㄸㅃㅆㅉ'.includes(glyph)};
for(const record of Object.values(records))record.compare=contrasts.find(group=>group.includes(record.glyph))||'';
export const pronunciationRecords=records;
const finalGroups={'ㄱ':'ㄱㄲㅋ','ㄴ':'ㄴ','ㄷ':'ㄷㅅㅆㅈㅊㅌㅎ','ㄹ':'ㄹ','ㅁ':'ㅁ','ㅂ':'ㅂㅍ','ㅇ':'ㅇ'};
const finalData={
 'ㄱ':['velar','국','舌の奥をつけたまま、音を止める。'],
 'ㄴ':['alveolar','산','舌先を歯ぐきにつけ、鼻へ響かせる。'],
 'ㄷ':['alveolar','옷','舌先を歯ぐきにつけたまま、音を止める。'],
 'ㄹ':['alveolar','물','舌先を歯ぐきにつけ、舌の横から音を通す。'],
 'ㅁ':['bilabial','밤','唇を閉じたまま、鼻へ響かせる。'],
 'ㅂ':['bilabial','밥','唇を閉じたまま、音を止める。'],
 'ㅇ':['velar','강','舌の奥をつけ、鼻へ響かせる。']
};
export function finalPronunciation(glyph,text){const word=batchimWord(text);if(word)return {...finalPronunciation(word.finalSound),glyph:word.glyph,sample:word.text,note:`${word.text}の発音は[${word.reading}]。この単語での音の形です。${word.connectionNote||'続く音によって読み方が変わることがあります。'}`,compare:''};const key=Object.keys(finalGroups).find(k=>finalGroups[k].includes(glyph));if(!key)return null;const [pose,sample,cue]=finalData[key];return {...records[glyph],poses:[pose],sample,cue,note:'単独で読むときの形です。後ろに母音を足さずに終えます。続く音によって発音が変わることがあります。',nasal:'ㄴㅁㅇ'.includes(key),aspirated:false,tense:false,final:true,compare:''};}
export function pronunciationParts(text){const word=batchimWord(text);if(word)return [{glyph:word.glyph,final:true}];if(text==='ㅇ')return [];if(records[text])return [{glyph:text,final:false}];const n=text.charCodeAt(0)-0xac00;if(text.length!==1||n<0||n>=11172)return [];const initials='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ',vowels='ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ',finals=' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';return [{glyph:initials[Math.floor(n/588)],final:false},{glyph:vowels[Math.floor(n%588/28)],final:false},...(n%28&&records[finals[n%28]]?[{glyph:finals[n%28],final:true}]:[])].filter(part=>part.glyph!=='ㅇ'||part.final);}
