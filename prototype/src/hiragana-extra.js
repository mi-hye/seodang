import {katakanaContent} from './katakana-content.js';
const hira=s=>Array.from(s,c=>c>='ァ'&&c<='ヶ'?String.fromCharCode(c.charCodeAt(0)-0x60):c).join('');
const letters={27:'グ ゲ ゴ ジ ゼ ゾ',28:'ヂ ヅ デ ド ビ ブ ベ ボ',29:'チャ チュ チョ ニャ ニュ ニョ ヒャ ヒュ ヒョ',30:'ミャ ミュ ミョ リャ リュ リョ ギャ ギュ ギョ',31:'ジャ ジュ ジョ ビャ ビュ ビョ ピャ ピュ ピョ'};
export const hiraganaExtraContent={},hiraganaExtraAudio={};
for(const [id,glyphs] of Object.entries(letters)){
 const group=glyphs.split(' ');
 hiraganaExtraContent[id]=group.map((glyph,index)=>{
  const [sourceId,items]=Object.entries(katakanaContent).find(([,items])=>items.some(([text])=>text===glyph));
  const sourceIndex=items.findIndex(([text])=>text===glyph),text=hira(glyph);
  hiraganaExtraAudio[`${id}.${index}`]={id:`hiragana-extra.${id}.${index}`,text,locale:'ja-JP',audioFile:`assets/audio/katakana/katakana.${sourceId}.${sourceIndex}.wav`,status:'ready',productionMethod:'Qwen3-TTS (MLX Audio)',voiceId:'Ono_Anna'};
  return [text,items[sourceIndex][1],group.filter(g=>g!==glyph).slice(0,2).map(hira)];
 });
}
export const hiraganaExtraCoaches={
 27:{0:'く・け・こ에 ゛를 붙이면 ぐ・げ・ご가 돼요.',3:'し・せ・そ에 ゛를 붙이면 じ・ぜ・ぞ가 돼요.'},
 28:{0:'ち・つ・て・と에 ゛를 붙였어요. ぢ는 じ와, づ는 ず와 같은 소리로 읽어요.',4:'ひ・ふ・へ・ほ에 ゛를 붙이면 び・ぶ・べ・ぼ가 돼요.'},
 29:{0:'ち에 작은 ゃ・ゅ・ょ를 붙여 ちゃ・ちゅ・ちょ로 읽어요.',3:'に에 작은 글자를 붙여 にゃ・にゅ・にょ로 읽어요.',6:'ひ에 작은 글자를 붙여 ひゃ・ひゅ・ひょ로 읽어요.'},
 30:{0:'み에 작은 ゃ・ゅ・ょ를 붙였어요. 두 글자를 한 박자로 읽어요.',3:'り에 작은 글자를 붙여 りゃ・りゅ・りょ로 읽어요.',6:'ぎ에도 작은 글자를 붙여 ぎゃ・ぎゅ・ぎょ로 읽어요.'},
 31:{0:'じ에 작은 ゃ・ゅ・ょ를 붙여 じゃ・じゅ・じょ로 읽어요.',3:'び에 작은 글자를 붙여 びゃ・びゅ・びょ로 읽어요.',6:'ぴ에는 ゜가 붙어 있어요. 작은 글자와 함께 ぴゃ・ぴゅ・ぴょ로 읽어요.'}
};
