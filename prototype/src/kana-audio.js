import { parcelWord } from './parcel-words.js';
// Files are generated offline; replace these paths to swap the voice provider.
export function kanaLetterAudio(letter) {
  return {id:`kana.letter.${letter.id}`,text:letter.text,locale:'ja-JP',voiceId:'Ono_Anna',status:'ready',audioFile:`assets/audio/kana/${letter.id}.wav`};
}
export function kanaCaseAudio(index, letters) {
  const text=index===0?letters.map(l=>l.text).join(''):index===1?parcelWord(letters).text:`${letters[0].text}、${letters.at(-1).text}`;
  const key=`case-${index+1}-${letters.map(l=>l.id).join('-')}`;
  return {id:`kana.story.${key}`,text,locale:'ja-JP',voiceId:'Ono_Anna',status:'ready',audioFile:`assets/audio/kana-stories/${key}.wav`};
}
