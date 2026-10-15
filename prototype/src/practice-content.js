import {isCasePractice} from './practice-state.js';
import {koreanStageZero} from './korean-state.js';
import {basicSinglePass} from './basics-state.js';
const loaded={};
const koreanSyllableMeaning=Object.fromEntries([
 ['아','ア'],['어','オ（口を広めに）'],['오','オ（唇を丸めて）'],['우','ウ（唇を丸めて）'],['으','ウ（唇を横に）'],['이','イ'],['가','カ／ガ'],['나','ナ'],['고','コ／ゴ'],['무','ム'],
 ...Array.from('다라바사자차카타파하야여요유').map((x,i)=>[x,['タ／ダ','ラ','パ／バ','サ','チャ／ジャ','チャ（強い息）','カ（強い息）','タ（強い息）','パ（強い息）','ハ','ヤ','ヨ（口を広めに）','ヨ（唇を丸めて）','ユ'][i]]),
 ...Array.from('까따빠싸짜').map((x,i)=>[x,['カ（濃音）','タ（濃音）','パ（濃音）','サ（濃音）','チャ（濃音）'][i]]),
 ...Array.from('애에얘예와워왜웨외위의').map((x,i)=>[x,['エ','エ','イェ','イェ','ワ','ウォ','ウェ','ウェ','ウェ','ウィ','ウィ（唇を丸めずに）'][i]]),
 ['산','山'],['밤','夜・栗'],['강','川'],['문','ドア'],['물','水'],['밥','ご飯']]);
const entry=(text,file,locale='ja-JP')=>({text,locale,status:'ready',audioFile:file});
export async function prepareContent(kind){
 if(loaded[kind])return;
 const paths={basic:'./basics.js',korean:'./korean-content.js',kana:'./kana-audio.js',labels:'./labels-state.js',listening:'./labels-state.js',play:'./content.js',sentence:'./sentence-content.js',dialogue:'./dialogue-content.js',reading:'./practice-reading.js'};
 loaded[kind]=await import(paths[kind]);
 if(['sentence','dialogue','reading','korean'].includes(kind))loaded.caseExercises ||= await import('./case-exercises.js');
 if(kind==='reading'){const source=await import('./reading-content.js'),{advancedCourse}=await import('./reading-advanced.js');loaded.readingSource={readingCourses:{...source.readingCourses,7:advancedCourse}};}
 if(kind==='kana')loaded.kanaState=await import('./kana-state.js');
}
export function practiceKey(s,kind){const id=kind==='basic'?s.basics?.active:kind==='korean'?s.korean?.active:kind==='kana'?s.kana?.active:kind==='reading'?s.onboardingLevel:0;return `${s.courseDirection}:${kind}:${id}`;}
export const caseTasks=(s,kind)=>isCasePractice(practiceKey(s,kind))?loaded.caseExercises?.caseExercises(s,kind,kind==='reading'?loaded.readingSource:loaded[kind]):null;
export function practiceUnits(s,kind){
 const mod=loaded[kind];if(!mod)return[];
 if(kind==='basic')return mod.basicContent[s.basics.active].map(([text,meaning],index)=>({text,meaning,audio:mod.basicAudio({basics:{active:s.basics.active,lessons:{[s.basics.active]:{index}}}})})).filter(unit=>s.basics.active!==10||unit.text.length>2);
 if(kind==='korean')return mod.koreanContent[s.korean.active].map((item,index)=>({text:item.answer&&Number(s.onboardingLevel)>=5?item.answer:item.text,meaning:item.meaning||koreanSyllableMeaning[item.text]||item.question,audio:entry(Number(s.onboardingLevel)>=5?item.answer:(item.spoken||item.text),`assets/audio/${Number(s.onboardingLevel)>=5?'practice':'korean'}/korean.${s.korean.active}.${index}.wav`,'ko-KR')}));
 if(kind==='kana')return loaded.kanaState.kanaLessons[s.kana.active].letters.map(letter=>({text:letter.text,meaning:letter.reading,audio:mod.kanaLetterAudio(letter)}));
 if(kind==='labels'||kind==='listening')return mod.labelWords.map(w=>({text:w.text,meaning:w.meaning,audio:entry(w.text,`assets/audio/labels/${w.id}.wav`)}));
 if(kind==='play')return mod.expressions.map(x=>({text:x.text,meaning:x.meaning,audio:entry(x.text,`assets/audio/cafe/case01.${x.id}.ja.wav`)}));
 if(kind==='sentence')return mod.sentences.map(x=>({text:x.text,meaning:x.meaning,audio:mod.sentenceAudio[x.id]}));
 if(kind==='dialogue')return mod.dialogueTurns.map(x=>({text:x.reply,meaning:x.replyMeaning,audio:mod.dialogueAudio[`${x.id}-reply`]}));
 return mod.practiceReading[s.onboardingLevel].map((x,index)=>({...x,audio:entry(x.text,`assets/audio/practice/reading.${s.onboardingLevel}.${index}.wav`)}));
}
export function completionAttempt(before,after,kind,action){
 if(kind==='basic')return ['basic-check','basic-next'].includes(action.type)&&before.basics?.lessons[before.basics.active]?.phase!=='done'&&after.basics?.lessons[before.basics.active]?.phase==='done';
 if(kind==='korean')return action.type==='korean-check'&&before.korean?.lessons[before.korean.active]?.phase!=='done'&&after.korean?.lessons[before.korean.active]?.phase==='done';
 if(kind==='kana')return action.type==='kana-next'&&before.kana?.lessons[before.kana.active]?.phase!=='summary'&&after.kana?.lessons[before.kana.active]?.phase==='summary';
 if(kind==='labels')return before.labels?.phase!=='summary'&&after.labels?.phase==='summary';
 if(kind==='listening')return before.listening?.index<4&&after.listening?.index===4;
 if(kind==='play')return before.episode.step!=='summary'&&after.episode.step==='summary';
 if(kind==='sentence')return before.sentence?.phase!=='summary'&&after.sentence?.phase==='summary';
 if(kind==='dialogue')return before.dialogue?.phase!=='done'&&after.dialogue?.phase==='done';
 if(kind==='reading')return before.readings?.[before.onboardingLevel]?.phase!=='done'&&after.readings?.[before.onboardingLevel]?.phase==='done';
 return false;
}
export function interceptCompletion(before,after,kind,action){
 if(kind==='basic'&&basicSinglePass(before.basics?.active)||kind==='korean'&&koreanStageZero(before.korean?.active))return after;
 if(!completionAttempt(before,after,kind,action))return after;
 const key=practiceKey(before,kind),count=practiceUnits(before,kind).length;
 if(!count)throw Error('Missing practice content');
 return {...before,practices:{...before.practices,[key]:before.practices?.[key]||{version:1,...(isCasePractice(key)?{caseVersion:1}:{}),round:0,mode:0,index:0,count,action:Object.fromEntries(Object.entries(action).filter(([,v])=>v!==undefined))}}};
}

// Extra distractors for short lessons keep the listening grid at four distinct choices.
export function practiceDistractors(s,kind){
 const mod=loaded[kind];
 if(kind==='korean')return mod.koreanContent[s.korean.active].flatMap(item=>item.others||[]);
 if(kind==='dialogue')return mod.dialogueTurns.flatMap(turn=>turn.choices);
 if(kind==='play')return ['あかい かばん','ドアの そば'];
 if(kind==='sentence')return ['これは わたしの かさです。'];
 if(kind==='reading')return {5:['水曜日も営業します。'],6:['本を持参しないと参加できません。'],7:['数値が改善すれば問題は解決する。']}[s.onboardingLevel];
 return [];
}
