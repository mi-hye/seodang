import {particleCourseCatalog,isParticleCourse,particleContentVersion} from './particle-course-catalog.js';
import {endingCourseCatalog,isEndingCourse,endingContentVersion} from './ending-course-catalog.js';
export const comparisonCourseCatalog=[...particleCourseCatalog,...endingCourseCatalog];
export const isComparisonCourse=id=>isParticleCourse(id)||isEndingCourse(id);
export const comparisonContentVersion=id=>isEndingCourse(id)?endingContentVersion:particleContentVersion;
