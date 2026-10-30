export const MAP_PAGE_SIZE=10;

export function mapPageWindow(total,current,requested){
 const count=Number.isSafeInteger(total)&&total>=0?total:0;
 const pageCount=Math.max(1,Math.ceil(count/MAP_PAGE_SIZE));
 const clamp=page=>Math.max(0,Math.min(pageCount-1,page));
 const currentPage=clamp(Number.isSafeInteger(current)&&current>=0?Math.floor(current/MAP_PAGE_SIZE):0);
 const page=Number.isSafeInteger(requested)&&requested>=0?clamp(requested):currentPage;
 const start=page*MAP_PAGE_SIZE,end=Math.min(count,start+MAP_PAGE_SIZE);
 return {page,pageCount,start,end,currentPage};
}
