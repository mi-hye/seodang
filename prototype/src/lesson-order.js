// Insert reserved lesson slots without changing the IDs or order of regular lessons.
const orderedSlots=lessons=>[...lessons].sort((a,b)=>a.number-b.number);
export function orderLessons(regularLessons,specialLessons=[]){
 const lessons=[...regularLessons];
 for(const lesson of orderedSlots(specialLessons).filter(l=>!l.replaces))lessons.splice(lesson.number-1,0,lesson);
 // Match stable identities, not offsets: unreleased previews leave their original
 // lesson in place, and saved records for that original remain readable.
 for(const lesson of specialLessons.filter(l=>l.replaces)){
  const index=lessons.findIndex(l=>(l.kind||l.action)===lesson.replaces.kind&&String(l.id)===String(lesson.replaces.id));
  if(index>=0)lessons[index]=lesson;
 }
 return lessons;
}
export function lessonNumberWithSpecials(number,specialLessons=[]){
 for(const lesson of orderedSlots(specialLessons).filter(l=>!l.replaces))if(number>=lesson.number)number++;
 return number;
}
