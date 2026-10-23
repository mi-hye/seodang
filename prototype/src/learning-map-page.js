import {courseGroup} from './curriculum.js';
import {selectedLevel} from './kana-state.js';

export const MAP_PAGE_SIZE=10;
export const MAP_PAGES_STORAGE_KEY='seodang.map-pages.v1';
export const mapPageKey=state=>`${state.courseDirection}:${courseGroup(selectedLevel(state))}`;

export function mapPageWindow(total,current,requested){
 const count=Number.isSafeInteger(total)&&total>=0?total:0;
 const pageCount=Math.max(1,Math.ceil(count/MAP_PAGE_SIZE));
 const clamp=page=>Math.max(0,Math.min(pageCount-1,page));
 const currentPage=clamp(Number.isSafeInteger(current)&&current>=0?Math.floor(current/MAP_PAGE_SIZE):0);
 const page=Number.isSafeInteger(requested)&&requested>=0?clamp(requested):currentPage;
 const start=page*MAP_PAGE_SIZE,end=Math.min(count,start+MAP_PAGE_SIZE);
 return {page,pageCount,start,end,currentPage};
}

const validPages=pages=>pages&&typeof pages==='object'&&!Array.isArray(pages)?Object.fromEntries(Object.entries(pages).filter(([key,page])=>/^(ko-ja|ja-ko):(0|2|4|5|7)$/.test(key)&&Number.isSafeInteger(page)&&page>=0)):{};
export function loadMapPages(storage){
 try{return validPages(JSON.parse(storage.getItem(MAP_PAGES_STORAGE_KEY)));}catch{return {};}
}
export function saveMapPages(storage,pages){
 try{storage.setItem(MAP_PAGES_STORAGE_KEY,JSON.stringify(validPages(pages)));return true;}catch{return false;}
}
