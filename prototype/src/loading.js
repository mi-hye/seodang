import {t,setUILanguage,loadUILanguage} from './i18n.js';
import { load } from './storage.js';
let onboarded = false;
try { const state=load(window.localStorage).state;onboarded=state.onboarded;await loadUILanguage(state);setUILanguage(state); } catch { /* First-run setup remains available. */ }
const destination = onboarded ? 'playable.html#home' : 'setup.html';
const sharedFiles = ['src/header.js', 'src/header.css', 'src/ui.js', 'src/media.js', 'src/storage.js', 'src/engine.js', 'src/kana-state.js', 'src/content.js'];
const files = [...sharedFiles, ...(onboarded
  ? ['playable.html', 'src/app.js', 'src/style.css', 'assets/cafe-dusk-v2.jpg']
  : ['setup.html', 'src/setup.js', 'src/setup.css'])];

const label = document.querySelector('#loading-label');
const percent = document.querySelector('#loading-percent');
const track = document.querySelector('.loading-track');
const fill = document.querySelector('.loading-fill');
const retry = document.querySelector('.retry');
const box = document.querySelector('.loading');
retry.textContent=t('다시 시도');track.setAttribute('aria-label',t('화면 준비'));document.querySelector('main').setAttribute('aria-label',t('서당 시작 화면'));document.querySelector('h1').textContent=t('서당');
let controller;
function progress(value) {
  percent.textContent = `${value}%`;
  track.setAttribute('aria-valuenow', value);
  fill.style.width = `${value}%`;
}
async function prepare() {
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;
  const timeout = setTimeout(() => controller.abort(), 15000);
  retry.hidden = true;
  box.setAttribute('aria-busy', 'true');
  label.textContent = t('불러오는 중');
  progress(0);
  let completed = 0;
  const count = files.length + 1;
  const done = () => { if (!signal.aborted) progress(Math.round(++completed / count * 100)); };
  try {
    await Promise.all([
      document.querySelector('.scene img').decode().then(done),
      ...files.map(async file => {
        const response = await fetch(file, { signal, cache: 'force-cache' });
        if (!response.ok) throw Error('Missing asset');
        await response.arrayBuffer();
        done();
      }),
    ]);
    clearTimeout(timeout);
    if (signal.aborted) return;
    label.textContent = t('준비됐어요');
    box.setAttribute('aria-busy', 'false');
    // Let the completed bar paint once before navigating; no artificial progress timer.
    requestAnimationFrame(() => requestAnimationFrame(() => window.location.replace(destination)));
  } catch {
    controller.abort();
    clearTimeout(timeout);
    label.textContent = t('불러오지 못했어요');
    box.setAttribute('aria-busy', 'false');
    retry.hidden = false;
  }
}
retry.addEventListener('click', prepare);
window.addEventListener('pagehide', () => controller?.abort(), { once: true });
prepare();
