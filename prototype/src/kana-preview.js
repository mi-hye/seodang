import { kanaLetterAudio } from './kana-audio.js';
// Await real speech completion so the highlighted glyph matches the voice.
export async function playLetterPreview(player, letters, onLetter, onDone, onError) {
  for (const letter of letters) {
    onLetter(letter.id);
    let failed = false;
    const playing = player.play(kanaLetterAudio(letter), true, message => {
      failed = true;
      onError(message);
    });
    const generation = player.generation;
    await playing;
    if (generation !== player.generation || failed) return;
  }
  onLetter(null);
  onDone();
}
