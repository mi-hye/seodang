export const MAP_PAGE_SIZE=10;

// Supplemental comparisons follow their parent, including at a ten-lesson boundary.
export function mapLessonSections(lessons){
 const sections=[];let regular=0;
 for(const [index,lesson] of lessons.entries()){
  if(!lesson.supplementary&&regular%MAP_PAGE_SIZE===0)sections.push({index:sections.length,start:index,end:index,lessons:[]});
  if(!sections.length)sections.push({index:0,start:index,end:index,lessons:[]});
  const section=sections.at(-1);section.lessons.push(lesson);section.end=index+1;
  if(!lesson.supplementary)regular++;
 }
 return sections.map(c=>({...c,regularCount:c.lessons.filter(l=>!l.supplementary).length}));
}
export function mapSectionWindow(lessons,current,requested){
 const sections=mapLessonSections(lessons),pageCount=Math.max(1,sections.length);
 const currentPage=Math.max(0,sections.findIndex(c=>current>=c.start&&current<c.end));
 const page=Number.isSafeInteger(requested)&&requested>=0?Math.min(pageCount-1,requested):currentPage;
 return {page,pageCount,currentPage,sections};
}
