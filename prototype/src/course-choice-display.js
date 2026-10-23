import {courseThreeFourChoiceLines} from './course-choice-display-three-four.js';
import {courseFiveChoiceLines} from './course-choice-display-five.js';

// Display metadata only: exercise answers and voice text keep the original string.
const choices = new Map([...courseThreeFourChoiceLines, ...courseFiveChoiceLines]
 .map(line => {const parts = line.split('|');return [parts.join(''), parts];}));

export const courseChoiceParts = text => choices.get(text) || [text];
