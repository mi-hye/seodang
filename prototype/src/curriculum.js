// Stored IDs remain stable; only the visible case curriculum is renumbered.
export const courseLevels=[0,2,4,5,7];
export const levelsFor=direction=>direction==='ja-ko'?[0,8,2,4,5,7]:courseLevels;
export const validCourseLevel=(level,direction)=>Number.isInteger(level)&&level>=0&&(level<=7||[8,9,10].includes(level)&&direction==='ja-ko');
export const canonicalLevel=level=>level===1||level===3?2:level;
export const courseGroup=level=>level===6?5:canonicalLevel(level);
export const displayLevel=level=>level===8?1.5:level===9?2.5:level===10?3.5:courseLevels.indexOf(courseGroup(level))+1;
export const courseNames={ko:['글자와 발음 익히기','짧은 문장으로 말하기','일상 대화 주고받기','글을 읽고 판단하기','생각 나누기'],ja:['文字と発音を覚える','短い文で伝える','日常会話をする','文章を読んで判断する','考えを伝える']};
export const courseName=(level,jp=false)=>level===8?'発音を集中練習する':level===9?'助詞の違いを比べる':level===10?'語尾の違いを比べる':courseNames[jp?'ja':'ko'][displayLevel(level)-1];
export const retiredAlphabetPractice=key=>/^ja-ko:scenario:(course1-1[1-7]|course20-1-(18|19|20))$/.test(key);
export const retiredPractice=key=>retiredAlphabetPractice(key)||/^(ko-ja:(labels|listening|play):|ko-ja:basic:6$|ja-ko:korean:(1-11|2-1)$)/.test(key);

export const japaneseLessonUI=s=>s?.courseDirection==='ja-ko';
