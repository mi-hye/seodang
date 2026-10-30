// Files are generated offline; replace these paths to swap the voice provider.
export function kanaLetterAudio(letter) {
  return {id:`kana.letter.${letter.id}`,text:letter.text,locale:'ja-JP',voiceId:'VOICEVOX Nemo 男声1',status:'ready',audioFile:`assets/audio/kana/${letter.id}.wav`};
}
