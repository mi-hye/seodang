// Continuous deformation of a single connected original-image mesh.
// Face motion is a rigid head turn; falloff is confined to the neck, ears and small gestures.
export const xs=[0,64,80,96,112,128,136,144,152,160,168,176,184,192,200,208,216,240,264,280,288,296,304,312,320,336,360,384,416,448,512];
export const ys=[0,64,96,128,160,176,184,192,200,208,216,232,256,272,280,288,296,304,312,320,328,336,344,352,360,368,376,384,392,400,416,448,480,512];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const ease=(keys,t)=>{for(let i=1;i<keys.length;i++){if(t<=keys[i][0]){const [a,v]=keys[i-1],[b,w]=keys[i];return v+(w-v)*smooth((t-a)/(b-a));}}return keys.at(-1)[1];};
const bump=(t,a,b,c)=>t<a||t>c?0:t<b?smooth((t-a)/(b-a)):1-smooth((t-b)/(c-b));
const local=(x,y,cx,cy,rx,ry)=>Math.exp(-2*((x-cx)**2/rx**2+(y-cy)**2/ry**2));
export const durations={Greet:300,Idle:540,Talk:180,Sit:540,Listen:180,Cheer:300};
export function deform(x,y,frame,name){
 const t=frame/60;
 const seated=name==='Sit'||name==='Listen',happy=name==='Cheer';
 const greet=name==='Greet'||happy;
 const angle=greet?ease([[0,0],[.35,.025],[1.05,-.095],[1.75,-.065],[2.4,.045],[3.25,-.018],[4.1,0],[5,0]],t):(name==='Talk'||name==='Listen')?ease([[0,0],[.65,-.06],[1.4,.045],[2.4,-.025],[3,0]],t):ease([[0,0],[1.2,.075],[2,.075],[3.4,-.05],[4.1,-.05],[5.4,.06],[6.2,.06],[7.5,-.025],[9,0]],t);
 const blink=Math.max(...(greet?[.48,3.65]:(name==='Talk'||name==='Listen')?[1.9]:[2.2,6.3]).map(at=>bump(t,at,at+.075,at+.2)));
 let dx=0,dy=0;
 // Squash only the existing eye ink, with zero influence beyond the small eye neighbourhood.
 for(const [cx,cy] of (seated?[[191,212],[303,195]]:[[191,198],[301,198]])){
  const weight=(1-smooth((Math.abs(x-cx)-13)/12))*(1-smooth((Math.abs(y-cy)-18)/13));
  dy-=(y-cy)*.84*blink*weight*(happy?0:1);
 }
 const headWeight=1-smooth((y-263)/37);
 const px=x-246,py=y+dy-277;
 dx+=(px*Math.cos(angle)-py*Math.sin(angle)-px)*headWeight;
 dy+=(px*Math.sin(angle)+py*Math.cos(angle)-py)*headWeight;
 // Ear tips trail the head. Very small motion preserves the approved silhouette.
 const ear=greet?ease([[0,0],[.5,0],[1.23,2.6],[1.95,.6],[2.65,-1.4],[3.6,.5],[4.3,0],[5,0]],t):Math.sin(t*Math.PI*2/((name==='Talk'||name==='Listen')?3:9))*3;
 dx+=ear*(local(x,y,104,205,49,68)-local(x,y,382,205,49,68))*(1-smooth((y-245)/30));
 const tail=(greet?Math.sin(t*8)*bump(t,.7,1.65,3.4):Math.sin(t*7)*Math.max(bump(t,.2,1.3,2.8),bump(t,4.4,5.5,7.2)))*9;
 dx+=tail*local(x,y,365,350,34,40)*smooth((x-320)/20);
 // Feet and lower legs remain fixed. No root translation or body scaling.
 const planted=1-smooth((y-398)/20);
 return [x+dx*planted,y+dy*planted];
}
