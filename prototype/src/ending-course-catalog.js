// Korean-only display level 3.5. Existing level and lesson IDs remain unchanged.
export const endingContentVersion=1;
export const endingCourseCatalog=[
 {id:'35-1',level:10,title:'할게요 と 할 거예요',titleParts:['할게요',' と ','할 거예요'],count:3,choiceCounts:[2,2,2],answers:[0,1,1]},
 {id:'35-2',level:10,title:'할래요 と 할까요',titleParts:['할래요',' と ','할까요'],count:3,choiceCounts:[2,2,2],answers:[1,0,1]},
 {id:'35-3',level:10,title:'-아/어서 と -(으)니까',titleParts:['-아/어서',' と ','-(으)니까'],count:3,choiceCounts:[2,2,2],answers:[0,1,0]},
 {id:'35-4',level:10,title:'-지만 と -는데',titleParts:['-지만',' と ','-는데'],count:3,choiceCounts:[2,2,2],answers:[1,0,1]}
];
export const isEndingCourse=id=>endingCourseCatalog.some(lesson=>lesson.id===id);
