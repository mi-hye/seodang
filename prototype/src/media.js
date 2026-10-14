import { episode } from "./content.js";
export const assets = {
  hanok: { src: "assets/hanok-dusk-v2.jpg", status: "temporary" },
  cafe: { src: "assets/cafe-dusk-v2.jpg", status: "temporary" },

};
export const audioManifest = Object.fromEntries(
  [
    [episode.intro[0].audioId, "ja-JP", "dialogue", episode.intro[0].japanese],
    ["case01.blue-bag.ja", "ja-JP", "learning", "あおい かばん"],
    ["case01.near-window.ja", "ja-JP", "learning", "まどの そば"],
  ].map(([id, locale, role, text]) => [
    id,
    {
      id,
      locale,
      role,
      text,
      audioFile: `assets/audio/cafe/${id}.wav`,
      status: "ready",
      productionMethod: "VOICEVOX Nemo",
      voiceStyleId: 10005,
      rightsReviewed: true,
      languageReviewed: false,
    },
  ]),
);
export async function checkJapaneseVoice(force = false) {
  const cap = globalThis.Capacitor;
  if (cap?.isNativePlatform?.() && cap.getPlatform?.() === 'ios') {
    return cap.nativePromise("SeodangSpeech", "checkVoice", { force });
  }
  return { proceed: true, highQuality: null };
}
const deviceSpeech = {
  prepare(entry) {
    return entry.locale === 'ja-JP' ? checkJapaneseVoice() : Promise.resolve({ proceed: true });
  },
  stop() {
    const cap = globalThis.Capacitor;
    if (cap?.isNativePlatform?.()) return cap.nativePromise("SeodangSpeech", "stop", {});
    globalThis.speechSynthesis?.cancel();
  },
  speak(entry) {
    const cap = globalThis.Capacitor;
    if (cap?.isNativePlatform?.()) return cap.nativePromise("SeodangSpeech", "speak", { text: entry.text, locale: entry.locale });
    if (!globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) throw Error("Speech unavailable");
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(entry.text);
      utterance.lang = entry.locale;
      utterance.rate = 0.9;
      const voice = speechSynthesis.getVoices().find(v => v.lang.replace('_', '-') === entry.locale);
      if (voice) utterance.voice = voice;
      utterance.onend = resolve;
      utterance.onerror = event => ['canceled', 'interrupted'].includes(event.error) ? resolve() : reject(event);
      speechSynthesis.speak(utterance);
    });
  },
};
export class AudioPlayer {
  constructor(factory = (src) => new Audio(src), speech = deviceSpeech) {
    this.speech = speech;
    this.factory = factory;
    this.current = null;
    this.finishCurrent = null;
    this.generation = 0;
  }
  stop() {
    this.generation++;
    this.finishCurrent?.();
    const stopped = Promise.resolve().then(() => this.speech.stop()).catch(() => {});
    if (this.current) {
      this.current.pause();
      this.current.currentTime = 0;
      this.current = null;
    }
    return stopped;
  }
  async play(entry, enabled, onError) {
    const stopped = this.stop();
    const token = this.generation;
    if (entry?.status === "device-tts") {
      if (!enabled || !entry.text) return;
      await stopped;
      if (token !== this.generation) return;
      try {
        const readiness = await this.speech.prepare?.(entry);
        if (token !== this.generation) return;
        if (readiness?.proceed === false) { await this.stop(); return; }
        await this.speech.speak(entry);
      }
      catch { if (token === this.generation) onError("기기 음성을 재생하지 못했어요. 휴대폰의 음성 설정을 확인해 주세요."); }
      return;
    }
    if (!enabled || !entry?.audioFile || entry.status !== "ready") return;
    await stopped;
    if (token !== this.generation) return;
    let sound;
    try { sound = this.factory(entry.audioFile); }
    catch { onError("음성을 불러오지 못했어요. 다시 눌러 주세요."); return; }
    this.current = sound;
    await new Promise(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        sound.onended = null;
        sound.onerror = null;
        if (this.finishCurrent === finish) this.finishCurrent = null;
        resolve();
      };
      const fail = () => {
        if (token === this.generation) {
          sound.pause();
          onError("음성을 재생하지 못했어요. 다시 눌러 주세요.");
        }
        finish();
      };
      this.finishCurrent = finish;
      sound.onended = finish;
      sound.onerror = fail;
      try { Promise.resolve(sound.play()).catch(fail); }
      catch { fail(); }
    });
  }
}
