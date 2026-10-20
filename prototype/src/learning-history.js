import {videoProgress} from './video-lesson-state.js';
import {expertProgress} from './expert-state.js';
import {scenarioProgress,scenarioLessons} from './scenario-state.js';
import {sentenceProgress} from './sentence-state.js';
import {basicLessons} from './basics-state.js';
// Local calendar dates follow the original app's writingActivity implementation.
export const localDateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const kanaCompletions=k=>!k?[]:[...([4,5,6,7,8,9].includes(k.version)?k.lessons.flatMap((l,i)=>l.caseSolved?[`kana-${k.version>=8?`v${k.version}-`:''}${i}`]:[]):[]),...kanaCompletions(k.previousCourse)];
export const completedCases = s => [...new Set([
 ...(s.history?.completed || []),
 ...Object.entries(s.scenarios||{}).filter(([key,p])=>key.startsWith('ko-ja:')&&p.completed).map(([key])=>key),
 ...kanaCompletions(s.kana),
 ...(s.labels?.completed?['labels']:[]), ...(s.listening?.completed?['listening']:[]),
 ...(basicLessons.map(l=>l.id).flatMap(id=>s.basics?.lessons?.[id]?.completed?[`basic-${id}`]:[])),
 ...(s.dialogue?.completed?['dialogue']:[]),
 ...([5,6,7].flatMap(level=>s.readings?.[level]?.completed?[`reading-${level}`]:[])),
 ...([1,2,3].flatMap(id=>s.sentenceLessons?.[id]?.completed?[`sentence-${id}`]:[])),
 ...(s.episode.step==='summary'?['cafe']:[]), ...(s.sentence?.completed?['sentence']:[])
])];
const dateKey = key => /^\d{4}-\d{2}-\d{2}$/.test(key) && localDateKey(new Date(`${key}T12:00:00`))===key;
export function validHistory(h) {
 return h===undefined || (h?.version===1 && dateKey(h.startedOn) && Array.isArray(h.completed) && new Set(h.completed).size===h.completed.length && h.completed.every(x=>['ko-ja:scenario:1',...scenarioLessons.map(l=>`ko-ja:scenario:${l.id}`),...basicLessons.map(l=>`basic-${l.id}`),'kana-0','kana-1','kana-2','kana-v8-0','kana-v8-1','kana-v8-2','kana-v9-0','kana-v9-1','kana-v9-2','kana-v9-3','kana-v9-4','cafe','sentence','sentence-1','sentence-2','sentence-3','labels','listening','dialogue','reading-5','reading-6','reading-7'].includes(x)) && h.days && typeof h.days==='object' && !Array.isArray(h.days) && Object.entries(h.days).every(([key,d])=>dateKey(key)&&key>=h.startedOn&&d&&['letters','expressions','sentences','cases'].every(k=>Number.isSafeInteger(d[k])&&d[k]>=0)));
}
export function recordLearning(before, after, action, now=new Date()) {
 const today=localDateKey(now);
 if(action.type.startsWith('video-')){
  if(action.type==='video-start')return after;
  const a=videoProgress(before),b=videoProgress(after),learned=action.type==='video-next'&&a.phase==='learn'&&(a.index!==b.index||b.phase==='done'),finished=!a.completed&&b.completed;
  if(!learned&&!finished)return after;
  after=structuredClone(after);let host=after;if(after.courseDirection==='ja-ko')host=after.korean ||= {version:4,active:'1-1',lessons:{}};
  const h=host.history ||= {version:1,startedOn:today,days:{},...(after.courseDirection==='ko-ja'?{completed:completedCases(before)}:{})};
  h.startedOn=h.startedOn<today?h.startedOn:today;const d=h.days[today] ||= {letters:0,expressions:0,sentences:0,cases:0};
  if(learned)d.expressions++;if(finished)d.cases++;return after;
 }
 if(action.type.startsWith('expert-')){
  if(action.type==='expert-start')return after;
  const a=expertProgress(before),b=expertProgress(after),learned=action.type==='expert-next'&&(a.phase==='review'&&(a.sentence!==b.sentence||b.phase==='done')||a.phase==='expression'&&(a.part!==b.part||a.phase!==b.phase)),finished=!a.completed&&b.completed;
  if(!learned&&!finished)return after;
  after=structuredClone(after);let host=after;if(after.courseDirection==='ja-ko')host=after.korean ||= {version:4,active:'1-1',lessons:{}};
  const h=host.history ||= {version:1,startedOn:today,days:{},...(after.courseDirection==='ko-ja'?{completed:completedCases(before)}:{})};
  h.startedOn=h.startedOn<today?h.startedOn:today;const d=h.days[today] ||= {letters:0,expressions:0,sentences:0,cases:0};
  if(learned)d.sentences++;if(finished)d.cases++;return after;
 }

 if(action.type.startsWith('scenario-')){
  const p=scenarioProgress(before),q=scenarioProgress(after),id=before.scenarioActive;
  const learned=(action.type==='scenario-next'&&p.phase==='quiz'&&p.checked||action.type==='scenario-speak-next'&&p.phase==='speak')&&(q.index!==p.index||q.phase==='done');
  const finished=learned&&!p.completed&&q.completed;
  if(before.courseDirection==='ja-ko'){
   if(learned||finished){
    after.korean ||= {version:4,active:'1-1',lessons:{}};
    const h=after.korean.history ||= {version:1,startedOn:today,days:{}};
    h.startedOn=h.startedOn<today?h.startedOn:today;
    const d=h.days[today] ||= {letters:0,expressions:0,sentences:0,cases:0};
    if(learned)d[id==='1'?'letters':id==='2'?'expressions':'sentences']++;
    if(finished)d.cases++;
   }
   return after;
  }
 }

 const h=after.history ||= {version:1,startedOn:today,days:{},completed:completedCases(before)};
 const oldCompleted=completedCases(before), allCompleted=completedCases(after);
 h.completed=[...new Set([...oldCompleted,...allCompleted])];
 let kind;
 if(['scenario-next','scenario-speak-next'].includes(action.type)){const p=scenarioProgress(before),q=scenarioProgress(after);if((p.phase==='quiz'&&p.checked||p.phase==='speak')&&(q.index!==p.index||q.phase==='done'))kind=before.scenarioActive==='1'?'letters':before.scenarioActive==='2'?'expressions':'sentences';}
 const prev=before.kana?.lessons[before.kana.active], next=after.kana?.lessons[after.kana.active];
 if(action.type==='kana-next' && prev?.phase==='learn' && (next?.index!==prev.index || next?.phase!==prev.phase))kind='letters';
 if(action.type==='next' && before.episode.step==='learn' && (after.episode.lesson!==before.episode.lesson||after.episode.step!==before.episode.step))kind='expressions';
 if((action.type==='sentence-next'||action.type==='sentence-check') && sentenceProgress(before).phase==='arrange' && (sentenceProgress(before).checked||action.type==='sentence-check') && !['arrange','speak'].includes(sentenceProgress(after).phase))kind='sentences';
 if(action.type==='sentence-speak-next'&&sentenceProgress(before).phase==='speak'&&sentenceProgress(after).phase!=='speak')kind='sentences';
 if(['labels-check','labels-next'].includes(action.type)&&before.labels?.phase==='build'&&after.labels?.phase!=='build')kind='expressions';
 if(action.type==='listening-answer'&&after.listening?.index>before.listening?.index)kind='expressions';
 if(action.type==='dialogue-check'&&before.dialogue?.phase==='practice'&&(after.dialogue.index!==before.dialogue.index||after.dialogue.phase==='done'))kind='sentences';
 if(action.type==='reading-check'){const level=before.onboardingLevel;const a=before.readings?.[level],b=after.readings?.[level];if(a&&b&&b.solved.length>a.solved.length)kind='sentences';}
 if(['basic-check','basic-next'].includes(action.type)){const id=before.basics?.active,a=before.basics?.lessons[id],b=after.basics?.lessons[id];if(a&&b&&(a.index!==b.index||b.phase==='done'&&a.phase!=='done'))kind='expressions';}
 const finished=allCompleted.filter(x=>!oldCompleted.includes(x)).length;
 if(kind||finished){
  h.startedOn=h.startedOn<today?h.startedOn:today;
  const day=h.days[today] ||= {letters:0,expressions:0,sentences:0,cases:0};
  if(kind)day[kind]++;
  day.cases+=finished;
 }
 return after;
}
