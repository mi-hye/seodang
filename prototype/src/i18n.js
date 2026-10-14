// Interface language follows the learning direction; lesson text keeps its own language.
let locale='ko';
export const isJapaneseUI=()=>locale==='ja';
export function setUILanguage(state){locale=state?.courseDirection==='ja-ko'?'ja':'ko';if(globalThis.document){document.documentElement.lang=locale;document.title=locale==='ja'?'ソダン':'서당';}}
let ja={},japaneseTranslations;
export async function loadUILanguage(state){if(state?.courseDirection==='ja-ko'){japaneseTranslations ||= import('./i18n-ja.js').then(module=>{ja=module.default;}).catch(error=>{japaneseTranslations=null;throw error;});await japaneseTranslations;}}

export const t=text=>locale==='ja'?(ja[text]??text):text;
// Explicitly marked static setup copy can switch both ways without losing its source.
export function translateSetup(root=document){for(const node of root.querySelectorAll('[data-i18n]'))node.textContent=t(node.dataset.i18n);for(const node of root.querySelectorAll('[data-i18n-label]'))node.setAttribute('aria-label',t(node.dataset.i18nLabel));}
export const levelLabels=['0. 글자와 소리','1. 단어','2. 단어와 짧은 표현','3. 짧은 문장','4. 일상 대화','5. 글의 핵심과 의견','6. 일본어로 읽고 생각하기','7. 듣고 숨은 뜻 이해하기'];

export async function confirmReset(){const cap=globalThis.Capacitor;if(cap?.isNativePlatform?.()&&cap.getPlatform?.()==='ios'){const result=await cap.nativePromise('SeodangUI','confirmDelete',{locale});return result.confirmed===true;}return window.confirm(t('정말 삭제하시겠습니까?'));}
