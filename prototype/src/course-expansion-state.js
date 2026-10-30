import {courseTwentyCatalog} from './course-twenty-catalog.js';
import {courseOneCatalog} from './course-one-catalog.js';
import {courseThreeCatalog} from './course-three-catalog.js';
import {courseFourCatalog} from './course-four-catalog.js';
import {courseFiveCatalog} from './course-five-catalog.js';

// Eager metadata only. Dialogues, translations and exercises load on course entry.
export const courseExpansionCatalog=[...courseOneCatalog,...courseThreeCatalog,...courseFourCatalog,...courseFiveCatalog,...courseTwentyCatalog];
export const expansionLesson=id=>courseExpansionCatalog.find(l=>l.id===id);
export const expansionReview=key=>{
 if(typeof key!=='string')return null;
 const parts=key.split(':');
 if(parts.length!==3)return null;
 const [direction,kind,id]=parts;
 const lesson=kind==='scenario'&&expansionLesson(id);
 return lesson&&['ko-ja','ja-ko'].includes(direction)&&(!lesson.directions||lesson.directions.includes(direction))?{count:6,version:1}:null;
};
