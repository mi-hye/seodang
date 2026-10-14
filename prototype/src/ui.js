import {t} from './i18n.js';
import { audioManifest } from "./media.js";
export const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
// Keep pedagogical phrases together; whitespace remains identical for copying and speech.
export const phraseText = (text, phrases = text.split(/(\s+)/)) => phrases
  .map(part => /^\s+$/.test(part) ? esc(part) : `<span class="text-phrase">${esc(part)}</span>`)
  .join('<wbr>');
const paths = {
  locate: "M12 2v3m0 14v3M2 12h3m14 0h3M19 12a7 7 0 1 0-14 0 7 7 0 0 0 14 0M14 12a2 2 0 1 0-4 0 2 2 0 0 0 4 0",
  people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  home: "M3 10L12 3l9 7v11h-6v-7H9v7H3Z",
  book: "M12 5v16M12 5C8 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-3-2-7-2-10 1Z",
  leaf: "M5 20C2 8 12 2 21 3c0 10-5 17-16 17ZM5 20l10-10",
  settings: "M9.5 2h5l.5 3 2 1.2 2.8-1.1 2.5 4.3-2.3 2v2.3l2.3 2-2.5 4.3-2.8-1.1-2 1.2-.5 2.9h-5L9 20.1l-2-1.2-2.8 1.1-2.5-4.3 2.3-2v-2.3l-2.3-2 2.5-4.3L7 6.2 9 5l.5-3ZM15.5 12a3.5 3.5 0 1 0-7 0 3.5 3.5 0 0 0 7 0Z",
  lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5ZM12 14v3",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  back: "M19 12H5m5-5-5 5 5 5",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 4 4L19 6",
  sound: "M11 4 5 9H2v6h3l6 5V4Zm5 4q5 4 0 8m3-11q8 7 0 14",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
  chart: "M4 20h16M5 17V11h3v6ZM10.5 17V4h3v13ZM16 17V8h3v9Z",
  note: "M5 3h15v18H5ZM2 7h6M2 12h6M2 17h6m9-10h5m-5 5h5",
  cards: "M7 3h12a2 2 0 0 1 2 2v12M5 7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm2 5h6m-6 4h4",
  cluebook: "M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM8 3v18M12 8h4m-4 4h4m-4 4h2",
  help: "M9 8c0-5 8-5 8 0 0 3-5 2-5 6m0 3v1",
  pause: "M8 5v14M16 5v14",
  play: "m7 4 13 8-13 8Z",
  window: "M3 3h18v18H3ZM12 3v18M3 12h18",
  cup: "M4 6h13v10q0 5-6 5T4 16ZM17 7h3q5 6-3 6M6 2v2m5-2v2",
};
export const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${`<path d="${paths[name] || paths.leaf}"/>`}</svg>`;
export const button = (label, action, cls = "primary", extra = "") =>
  `<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
export function bag(color) {
  const c =
    color === "red"
      ? ["#B04A3B", "#DC8060", "#763E34"]
      : ["#3F739F", "#79ACCA", "#294962"];
  return `<svg class="bag-art" viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="63" cy="108" rx="42" ry="8" fill="#171316" opacity=".32"/><path d="M37 37V27Q43 12 63 17Q78 19 78 34" fill="none" stroke="${c[2]}" stroke-width="8"/><path d="M41 32V25Q54 12 68 24V33" fill="none" stroke="${c[1]}" stroke-width="3"/><path d="M26 37L77 30L98 45L105 98L77 109L18 97Z" fill="${c[2]}"/><path d="M26 37L77 30L82 102L18 97Z" fill="${c[0]}"/><path d="M26 37Q44 28 77 30L77 40L24 48Z" fill="${c[1]}"/><path d="M82 43L94 48L100 92L84 99Z" fill="${c[0]}"/><path d="M29 63L68 60L72 90L24 91Z" fill="${c[2]}"/><path d="M30 64L68 61L68 86L26 87Z" fill="${c[0]}"/><path d="M31 66L66 63M27 85L66 84M76 42L80 96" fill="none" stroke="${c[1]}" stroke-width="2"/><path d="M35 45L70 40" stroke="#E1C28D" stroke-width="2"/><path d="M69 40L72 49" stroke="#E1C28D" stroke-width="3" stroke-linecap="round"/><path d="M87 54L94 89" stroke="${c[1]}" stroke-width="2"/><rect x="43" y="73" width="12" height="6" rx="1" fill="#D7C39B"/></svg>`;
}
export function audioButton(id, sound, label = "듣기", iconOnly = false) {
  const a = audioManifest[id];
  return a?.status === "device-tts" || (a?.audioFile && a.status === "ready")
    ? button(
        iconOnly ? icon("sound") : `${esc(label)} ${icon("sound")}`,
        "audio",
        iconOnly ? "icon-button expression-listen" : "text-button",
        `aria-label="${esc(label)}" data-id="${id}" ${sound ? "" : 'disabled title="소리가 꺼져 있어요"'}`,
      )
    : '<span class="audio-missing">음성 준비 중 · 읽기로 진행</span>';
}
export function expressionImage(e) {
  return e.image ? `<img class="expression-image" src="${esc(e.image.src)}" alt="${esc(e.image.alt)}" width="1536" height="1024" loading="lazy" decoding="async">` : "";
}
export function expressionCard(
  e,
  { meaning = false, sound = true, beginner = false, picture = false, compactAudio = false, showReading = false } = {},
) {
  return `<article class="expression">${picture ? expressionImage(e) : ""}<span class="eyebrow">일본어 표현</span><div class="expression-heading audio-text-row"><h3 lang="ja">${phraseText(e.text)}</h3>${audioButton(`case01.${e.id}.ja`, sound, `${e.text} 다시 듣기`, true)}</div>${meaning ? `<p>${e.meaning}</p>` : `<details><summary>뜻 확인하기</summary><p>${e.meaning}</p></details>`}<div class="expression-parts">${meaning ? e.parts.map(([ja, ko]) => `<span><b lang="ja">${phraseText(ja)}</b> ${ko}</span>`).join("") : ""}</div>${showReading ? `<div class="expression-reading"><p lang="ja-Latn">${e.reading}</p><p>${e.help}</p></div>` : `<details><summary>${beginner ? "글자와 읽는 법 도움" : "읽는 법 보기"}</summary><p lang="ja-Latn">${e.reading}</p><p>${e.help}</p><small>일반 표기: <span lang="ja">${phraseText(e.natural)}</span></small></details>`}</article>`;
}

export function homeCaseCard({ title, action, actionLabel }) {
  const parts=title.split(' · '),position=parts.length>1?parts.shift():null;
  return `<section class="case-card home-start-card" aria-label="${t('바로 학습하기')}"><div class="home-card-heading">${position?`<span class="home-position">${esc(position)}</span>`:''}<h2>${esc(parts.join(' · '))}</h2></div>${button(`${esc(actionLabel)} ${icon("arrow")}`,action,'primary')}</section>`;
}
