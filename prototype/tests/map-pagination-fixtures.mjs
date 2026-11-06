import {renderLearningMap} from '../src/learning-map.js';
import {studyCatalog} from '../src/study-catalog.js';
import {courseGroup} from '../src/curriculum.js';
import {selectedLevel} from '../src/kana-state.js';
import {comparisonAttachment} from '../src/comparison-attachments.js';
export const catalogSections=state=>{const sections=[];let regular=0;for(const l of mapCatalog(state)){const special=l.kind==='korean'&&comparisonAttachment(l.id);if(!special&&regular++%10===0)sections.push([]);sections.at(-1).push(l);}return sections;};

export const mapCatalog=state=>studyCatalog(state).filter(lesson=>courseGroup(lesson.level)===courseGroup(selectedLevel(state)));
export const mapPanels=html=>[...html.matchAll(/<section class="map-page"[^>]*>[\s\S]*?<\/section>/g)].map(match=>match[0]);
export const activeMapPage=html=>mapPanels(html).find(panel=>/data-active="true"/.test(panel))||'';
export const renderLearningMapPages=state=>Array.from({length:Math.max(1,catalogSections(state).length)},(_,page)=>renderLearningMap(state,{page}).replace(/<section class="map-page"[^>]*>[\s\S]*?<\/section>/g,panel=>/data-active="true"/.test(panel)?panel:''));
export const renderAllLearningMap=state=>renderLearningMapPages(state).join('');
