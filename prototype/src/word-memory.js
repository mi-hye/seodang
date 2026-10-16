import {esc} from './ui.js';
// Only compound-word explanations belong here. No current word has a compound tip.
const tips={};
const memoryIcon='<svg class="word-memory-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 16c0-2-3-3-3-6a6.5 6.5 0 0 1 13 0c0 3-3 4-3 6Z"/><path d="M9 19h6m-5 3h4M12 1v1M2 7l1.5.5M22 7l-1.5.5M9.5 10.5l2.5 2 2.5-2M12 12.5V16"/></svg>';
export function wordMemory(word){
 const tip=tips[word];if(!tip?.compound)return '';
 return `<details class="word-memory"><summary>${memoryIcon}<span>기억 팁</span></summary><div class="word-memory-body"><img class="word-memory-scene" src="assets/word-memory/${tip.image}.svg" alt="${esc(tip.alt)}" width="280" height="140" loading="lazy" decoding="async"><p>${esc(tip.text)}</p></div></details>`;
}
