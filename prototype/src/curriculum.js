// Stored IDs remain stable; only the visible case curriculum is renumbered.
export const courseLevels=[0,2,4,5,7];
export const canonicalLevel=level=>level===1||level===3?2:level;
export const courseGroup=level=>level===6?5:canonicalLevel(level);
export const displayLevel=level=>courseLevels.indexOf(courseGroup(level))+1;
export const courseNames={ko:['글자와 발음 익히기','짧은 문장으로 말하기','일상 대화 주고받기','글을 읽고 판단하기','생각 나누기'],ja:['文字と発音を覚える','短い文で伝える','日常会話をする','文章を読んで判断する','考えを伝える']};
export const courseName=(level,jp=false)=>courseNames[jp?'ja':'ko'][displayLevel(level)-1];
export const retiredPractice=key=>/^(ko-ja:(labels|listening|play):|ko-ja:basic:6$|ja-ko:korean:(1-11|2-1)$)/.test(key);

export const koreanImmersion=s=>s?.courseDirection==='ja-ko'&&Number(s.onboardingLevel)>=7;
export const japaneseLessonUI=s=>s?.courseDirection==='ja-ko'&&!koreanImmersion(s);
