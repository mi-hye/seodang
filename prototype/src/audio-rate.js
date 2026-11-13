// One user-selected speed for learning audio; keep this module independent of lesson data.
export const normalizeAudioRate=value=>Number.isFinite(Number(value))?Math.round(Math.max(0.3,Math.min(1,Number(value)))*10)/10:1;
export const audioRateLabel=(value,japanese=false)=>`${japanese?'再生速度':'재생 속도'} ${normalizeAudioRate(value).toFixed(1)}×`;
export function audioRateControl(value,japanese=false){
 const rate=normalizeAudioRate(value);
 return `<button type="button" class="audio-rate-trigger" data-audio-rate="${rate}" data-audio-rate-language="${japanese?'ja':'ko'}" aria-label="${audioRateLabel(rate,japanese)}" aria-haspopup="dialog" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4 5 9H2v6h3l6 5V4Zm5 4q5 4 0 8m3-11q8 7 0 14"/></svg></button>`;
}
