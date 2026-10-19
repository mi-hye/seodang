const KEY='seodang.community.feed.v1';
export function readCommunityCache(owner,storage=globalThis.localStorage){
 try{const data=JSON.parse(storage.getItem(KEY));if(!owner||data?.owner!==owner||data.profile?.id!==owner)return null;
 if(!Array.isArray(data.posts)||!data.posts.every(p=>typeof p.id==='string'&&typeof p.body==='string'&&typeof p.profile?.nickname==='string'&&Number.isFinite(Date.parse(p.created_at))))return null;
 return data;
 }catch{return null;}
}
export function saveCommunityCache(owner,profile,posts,storage=globalThis.localStorage){
 if(!owner||profile?.id!==owner)return;
 try{storage.setItem(KEY,JSON.stringify({owner,profile,posts:posts.slice(0,20)}));}catch{/* A full device store must not interrupt the conversation. */}
}
export function clearCommunityCache(storage=globalThis.localStorage){try{storage.removeItem(KEY);}catch{}}
