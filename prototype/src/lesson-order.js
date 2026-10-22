// Insert reserved lesson slots without changing the IDs or order of regular lessons.
const orderedSlots=lessons=>[...lessons].sort((a,b)=>a.number-b.number);
export function orderLessons(regularLessons,specialLessons=[]){
 const lessons=[...regularLessons];
 for(const lesson of orderedSlots(specialLessons))lessons.splice(lesson.number-1,0,lesson);
 return lessons;
}
export function lessonNumberWithSpecials(number,specialLessons=[]){
 for(const lesson of orderedSlots(specialLessons))if(number>=lesson.number)number++;
 return number;
}
