// Original centerline geometry, in a 100 × 100 practice square.
// Teaching reference (order only; artwork is not copied):
// https://geulssibang.com/hangul/order/
const stroke=(points,label)=>({points,label:label||[points[0][0]-8,points[0][1]-6]});
const S=(...points)=>stroke(points);
const circle=(cx,cy,rx,ry)=>stroke(Array.from({length:49},(_,i)=>{const a=-Math.PI/2-i*Math.PI*2/48;return [cx+Math.cos(a)*rx,cy+Math.sin(a)*ry];}),[cx-8,cy-ry-6]);
const base={
 'ㄱ':[S([20,20],[80,20],[80,80])],
 'ㄴ':[S([20,20],[20,80],[80,80])],
 'ㄷ':[S([20,20],[80,20]),stroke([[20,20],[20,80],[80,80]],[12,35])],
 'ㄹ':[S([20,20],[80,20],[80,50]),S([20,50],[80,50]),stroke([[20,50],[20,80],[80,80]],[12,65])],
 'ㅁ':[stroke([[20,20],[20,80]],[12,34]),S([20,20],[80,20],[80,80]),S([20,80],[80,80])],
 'ㅂ':[S([20,20],[20,80]),S([80,20],[80,80]),S([20,50],[80,50]),S([20,80],[80,80])],
 'ㅅ':[S([50,20],[42,47],[20,80]),stroke([[44,40],[63,60],[80,80]],[62,37])],
 'ㅇ':[circle(50,50,30,30)],
 'ㅈ':[S([20,20],[80,20],[65,45],[45,65],[20,80]),stroke([[53,57],[66,70],[80,80]],[64,51])],
 'ㅊ':[S([42,20],[58,20]),S([20,36],[80,36],[64,56],[45,70],[20,80]),stroke([[52,66],[66,74],[80,80]],[65,61])],
 'ㅋ':[S([20,20],[80,20],[80,80]),S([20,50],[80,50])],
 'ㅌ':[S([20,20],[80,20]),S([20,50],[80,50]),stroke([[20,20],[20,80],[80,80]],[12,35])],
 'ㅍ':[S([20,20],[80,20]),stroke([[34,20],[34,80]],[26,36]),stroke([[66,20],[66,80]],[58,36]),S([20,80],[80,80])],
 'ㅎ':[S([40,20],[60,20]),S([20,34],[80,34]),circle(50,62,24,18)],
 'ㅏ':[S([40,20],[40,80]),S([40,50],[75,50])],
 'ㅑ':[S([40,20],[40,80]),S([40,40],[75,40]),S([40,62],[75,62])],
 'ㅓ':[S([25,50],[60,50]),S([60,20],[60,80])],
 'ㅕ':[S([25,40],[60,40]),S([25,62],[60,62]),S([60,20],[60,80])],
 'ㅗ':[S([50,25],[50,65]),S([20,65],[80,65])],
 'ㅛ':[S([38,25],[38,65]),S([62,25],[62,65]),S([20,65],[80,65])],
 'ㅜ':[S([20,35],[80,35]),S([50,35],[50,80])],
 'ㅠ':[S([20,35],[80,35]),S([38,35],[38,80]),S([62,35],[62,80])],
 'ㅡ':[S([20,50],[80,50])],
 'ㅣ':[S([50,20],[50,80])]
};
function fit(strokes,[x,y,w,h]){const point=([px,py])=>[x+(px-20)*w/60,y+(py-20)*h/60];return strokes.map(s=>({points:s.points.map(point),label:point(s.label)}));}
for(const [double,single] of Object.entries({'ㄲ':'ㄱ','ㄸ':'ㄷ','ㅃ':'ㅂ','ㅆ':'ㅅ','ㅉ':'ㅈ'}))base[double]=[...fit(base[single],[16,22,28,56]),...fit(base[single],[57,22,28,56])];
for(const [combined,first] of Object.entries({'ㅐ':'ㅏ','ㅒ':'ㅑ','ㅔ':'ㅓ','ㅖ':'ㅕ'}))base[combined]=[...fit(base[first],[20,20,42,60]),S([80,20],[80,80])];
for(const [combined,first,second] of [['ㅘ','ㅗ','ㅏ'],['ㅝ','ㅜ','ㅓ'],['ㅚ','ㅗ','ㅣ'],['ㅟ','ㅜ','ㅣ'],['ㅢ','ㅡ','ㅣ']])base[combined]=[...fit(base[first],[16,32,42,48]),...fit(base[second],[66,20,22,60])];
for(const [combined,first] of [['ㅙ','ㅘ'],['ㅞ','ㅝ']])base[combined]=[...fit(base[first],[18,20,43,60]),S([84,20],[84,80])];
const initials=[...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'],vowels=[...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'];
const finals=['',...'ㄱㄲ','ㄳ',...'ㄴ','ㄵ','ㄶ',...'ㄷㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ',...'ㅁㅂ','ㅄ',...'ㅅㅆㅇㅈㅊㅋㅌㅍㅎ'];
export function koreanStrokes(text){
 if(base[text])return base[text];
 if([...text].length!==1)return null;
 const code=text.codePointAt(0)-0xac00;if(code<0||code>=11172)return null;
 const initial=initials[Math.floor(code/588)],vowel=vowels[Math.floor(code/28)%21],final=finals[code%28];
 if(!base[initial]||!base[vowel]||(final&&!base[final]))return null;
 const horizontal='ㅗㅛㅜㅠㅡ'.includes(vowel),mixed='ㅘㅙㅚㅝㅞㅟㅢ'.includes(vowel);
 let result=horizontal?[...fit(base[initial],[25,15,50,29]),...fit(base[vowel],[15,50,70,34])]:mixed?[...fit(base[initial],[17,15,30,28]),...fit(base[vowel],[15,47,70,36])]:[...fit(base[initial],[15,22,34,56]),...fit(base[vowel],[56,15,30,70])];
 if(final)result=[...fit(result,[20,14,60,42]),...fit(base[final],[30,68,40,19])];
 return result;
}
export const strokePath=s=>s.points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
