import {cleanupPhotos} from './worker.mjs';
const json=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return json(405,{error:'method_not_allowed'});
 const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),url=Deno.env.get('SUPABASE_URL'),secret=Deno.env.get('COMMUNITY_PHOTO_CLEANUP_SECRET');
 // Gateway JWT verification plus an explicit server-only credential check.
 if(!service||!url||!secret||req.headers.get('X-Cleanup-Secret')!==secret)return json(401,{error:'unauthorized'});
 try{return json(200,await cleanupPhotos({url,service}));}
 catch(error){console.error('Photo cleanup failed',error instanceof Error?error.message:'unknown');return json(503,{error:'cleanup_unavailable'});}
});
