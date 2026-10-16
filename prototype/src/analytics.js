import {developmentMode,appVersion} from './build-config.js';
import {createAnalytics,ANALYTICS_KEY} from './analytics-core.js';
import {displayLevel} from './curriculum.js';
// Public ingestion token, not a personal API key. Management credentials never ship.
const token='phc_qNV5rqX8vHJfAKCMxuZmqoa2e4rgLNYcTetkMJt8DBMH';
let storage;try{storage=window.localStorage;}catch{storage={getItem(){return null;},setItem(){throw Error();}};}
const platform=globalThis.Capacitor?.getPlatform?.()||'web';
export const analytics=createAnalytics({storage,platform,environment:developmentMode||platform==='web'?'development':'production',appVersion,send:(batch,signal)=>fetch('https://us.i.posthog.com/batch/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:token,batch}),signal,credentials:'omit',referrerPolicy:'no-referrer'})});
export const analyticsContext=s=>({course_direction:s.courseDirection,level:displayLevel(s.onboardingLevel??0)});
export function openAnalytics(s){analytics.capture('app_opened',analyticsContext(s));void analytics.flush();}
setInterval(()=>void analytics.flush(),15000);
window.addEventListener('online',()=>void analytics.flush());
window.addEventListener('pagehide',()=>void analytics.flush());
window.addEventListener('storage',e=>{if(e.key===ANALYTICS_KEY||e.key===null)analytics.reload();});
