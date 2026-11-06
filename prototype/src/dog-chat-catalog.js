// Eligibility only. Dialogue copy is loaded when the learner opens the practice.
export const dogChatLessonKeys=Object.freeze(['ko-ja:sentence:3','ja-ko:korean:3-1']);
export function dogChatKey(state,kind){
 if(state?.courseDirection==='ko-ja'&&kind==='sentence'&&(state.sentenceActive??0)===3)return dogChatLessonKeys[0];
 if(state?.courseDirection==='ja-ko'&&kind==='korean'&&state.korean?.active==='3-1')return dogChatLessonKeys[1];
 return null;
}
