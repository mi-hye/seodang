import {esc} from './ui.js';
// Visual associations only; no extra vocabulary or character-etymology claims.
const tips={
 'かさ':{image:'umbrella-shape',alt:'둥근 우산과 굽은 손잡이',text:'굽은 손잡이가 달린 우산을 떠올리며 “카사”.'},
 'くつ':{image:'shoe-shape',alt:'く처럼 꺾인 신발 앞코',text:'く의 꺾인 모양을 신발 앞코처럼 떠올려요.'},
 'いぬ':{image:'dog-shape',alt:'ぬ의 작은 고리와 강아지의 말린 꼬리',text:'ぬ 끝의 작은 고리를 강아지 꼬리처럼 떠올려요.'},
 'そら':{image:'sky-shape',alt:'구름이 떠 있는 넓은 하늘',text:'구름이 둥둥 떠 있는 하늘을 보며 “소라”.'}
};
const memoryIcon='<svg class="word-memory-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 16c0-2-3-3-3-6a6.5 6.5 0 0 1 13 0c0 3-3 4-3 6Z"/><path d="M9 19h6m-5 3h4M12 1v1M2 7l1.5.5M22 7l-1.5.5M9.5 10.5l2.5 2 2.5-2M12 12.5V16"/></svg>';
export function wordMemory(word){
 const tip=tips[word];if(!tip)return '';
 return `<details class="word-memory"><summary>${memoryIcon}<span>기억 팁</span></summary><div class="word-memory-body"><img class="word-memory-scene" src="assets/word-memory/${tip.image}.svg" alt="${esc(tip.alt)}" width="280" height="140" loading="lazy" decoding="async"><p>${esc(tip.text)}</p></div></details>`;
}
