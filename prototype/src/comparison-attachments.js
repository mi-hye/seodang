import {courseGroup} from './curriculum.js';
import {comparisonCourseCatalog} from './comparison-course-catalog.js';
// Stable parents, never visible numbers: songs can change the displayed position.
// Quotes come from the parent lesson; related contrasts retain their existing IDs.
const links=[
 ['25-1',2,'korean','3-4','이것은 제 가방이에요.'],
 ['25-2',5,'scenario','course4-14','문장은 확인할 수 있지만 금액은 담당자에게 물어봐 주세요.'],
 ['25-3',2,'korean','3-1','커피를 좋아해요.'],
 ['25-4',2,'korean','3-3','지금 역에 있어요.'],
 ['25-5',4,'scenario','course3-8','저 모퉁이에서 오른쪽으로 돌면 되나요?'],
 ['25-6',4,'korean','4-1','카드로 할게요.'],
 ['25-7',2,'scenario','14','내일 같이 산책할까요?'],
 ['25-8',5,'scenario','course4-11','보내 주신 자료를 고객에게 전달해도 될까요?'],
 ['25-9',5,'scenario','course4-13','보내기 전에 저에게 보여 주시면 좋겠어요.'],
 ['25-10',2,'scenario','13','파란 공책도 있어요?'],
 ['25-11',4,'scenario','3','아침 식사는 일곱 시부터 아홉 시까지예요.'],
 ['25-12',2,'scenario','15','한 잔만 주세요.'],
 ['25-13',5,'korean','5-1','버스보다 빠를 때도 있고 운동도 할 수 있어서 좋아요.'],
 ['35-1',4,'scenario','8','오후 다섯 시까지 찾으러 올게요.'],
 ['35-2',2,'scenario','14','내일 같이 산책할까요?'],
 ['35-3',4,'scenario','course3-13','어제 산 셔츠가 조금 작아서요.'],
 ['35-4',4,'scenario','6','방에 따뜻한 물이 안 나오는데요.']
];
export const comparisonAttachments=links.map(([id,level,kind,parentId,example])=>({...comparisonCourseCatalog.find(l=>l.id===id),level,parent:{kind,id:parentId},example,label:id.startsWith('25-')?'特別学習 · 助詞':'特別学習 · 語尾'}));
export const comparisonAttachment=id=>comparisonAttachments.find(l=>l.id===id);
export const comparisonsAfter=(direction,kind,id)=>direction==='ja-ko'?comparisonAttachments.filter(l=>l.parent.kind===kind&&l.parent.id===String(id)):[];
export function resumedComparison(s){
 const l=comparisonAttachment(s.comparisonResume),p=s.korean?.lessons?.[l?.id];
 return s.courseDirection==='ja-ko'&&l?.level===courseGroup(s.onboardingLevel)&&p?.started&&p.phase!=='done'?l:null;
}
// Load old 2.5/3.5 records before hiding those levels. Content/progress stay intact.
export function migrateComparisonPlacement(s){
 const active=comparisonAttachment(s.korean?.active);
 const mapped=old=>active&&(old===9?active.id.startsWith('25-'):active.id.startsWith('35-'))?active.level:old===9?2:4;
 const oldLevel=s.courseDirection==='ja-ko'?s.onboardingLevel:undefined;
 const legacyCurrent=[9,10].includes(oldLevel),legacySaved=[9,10].includes(s.courseLevels?.['ja-ko']);
 if(legacyCurrent)s.onboardingLevel=mapped(oldLevel);
 if(legacySaved)s.courseLevels['ja-ko']=mapped(s.courseLevels['ja-ko']);
 if((legacyCurrent||legacySaved)&&active&&s.korean?.lessons?.[active.id]?.started&&s.korean.lessons[active.id].phase!=='done')s.comparisonResume=active.id;
 return s;
}

// Insert after media placement so every comparison follows its stable parent.
export function insertComparisonLessons(lessons,direction,create){
 return lessons.flatMap(l=>[l,...comparisonsAfter(direction,l.kind??l.action,l.id).map(c=>create({...c,title:`${c.label} · ${c.title}`}))]);
}
