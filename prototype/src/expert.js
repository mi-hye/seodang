import {renderDiscussion,discussionAudio} from './expert-discussion.js';
export {mountKoreanSpeaking as mountExpertSpeaking} from './korean-speaking.js';
import {expertProgress} from './expert-state.js';
let content;
export async function prepareExpert(){content ||= await fetch('src/expert-content.json').then(r=>{if(!r.ok)throw Error('Expert content unavailable');return r.json();});}
export function expertAudio(s){const a=content?.[s.courseDirection]?.[s.expertActive??0];return a?discussionAudio(a.discussion,expertProgress(s),a.audio.locale):null;}
export function renderExpert(s,top){return renderDiscussion(s,content[s.courseDirection][s.expertActive??0].discussion,top);}
