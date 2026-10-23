import {renderLearningMap} from '../src/learning-map.js';
import {studyCatalog} from '../src/study-catalog.js';
import {courseGroup} from '../src/curriculum.js';
import {selectedLevel} from '../src/kana-state.js';
import {MAP_PAGE_SIZE} from '../src/learning-map-page.js';

export const mapCatalog=state=>studyCatalog(state).filter(lesson=>courseGroup(lesson.level)===courseGroup(selectedLevel(state)));
export const mapPanels=html=>[...html.matchAll(/<section class="map-page"[^>]*>[\s\S]*?<\/section>/g)].map(match=>match[0]);
export const activeMapPage=html=>mapPanels(html).find(panel=>/data-active="true"/.test(panel))||'';
export const renderLearningMapPages=state=>Array.from({length:Math.max(1,Math.ceil(mapCatalog(state).length/MAP_PAGE_SIZE))},(_,page)=>renderLearningMap(state,{page}).replace(/<section class="map-page"[^>]*>[\s\S]*?<\/section>/g,panel=>/data-active="true"/.test(panel)?panel:''));
export const renderAllLearningMap=state=>renderLearningMapPages(state).join('');
