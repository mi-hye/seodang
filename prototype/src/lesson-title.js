import {scenarioLessons,scenarioTitle} from './scenario-state.js';
import {videoLesson,lessonNumberWithVideo} from './video-lesson-state.js';
import {songsForCourse} from './song-state.js';
import {sentenceLessons,sentenceId} from './sentence-state.js';
import {kanaLessons} from './kana-state.js';
import {basicLessons} from './basics-state.js';
import {koreanLessons} from './korean-state.js';
export function lessonTitle(s,kind,fallback=''){
 if(kind==='song'){const l=songsForCourse(s).find(l=>l.id===s.songActive);return l?`${l.number}. ${l.title}`:fallback;}
 if(kind==='video'){const l=videoLesson(s);return l?`${l.number}. ${l.title}`:fallback;}
 if(kind==='scenario'){const l=scenarioLessons.find(l=>l.id===s.scenarioActive);return l?`${lessonNumberWithVideo(s,l.number[s.courseDirection])}. ${scenarioTitle(s,l)}`:fallback;}
 let number=1,title=fallback.replace(/^\d+-\d+ · /,'');
 if(kind==='kana'){number=(s.kana?.active||0)+1;title=kanaLessons[number-1].caseTitle;}
 else if(kind==='basic'){const id=s.basics?.active||6;number=id===6?3:kanaLessons.length+basicLessons.filter(l=>l.id!==6).findIndex(l=>l.id===id)+1;title=basicLessons.find(l=>l.id===id)?.title||title;}
 else if(kind==='korean'){const lesson=koreanLessons.find(l=>l.id===s.korean?.active);if(lesson){number=koreanLessons.filter(l=>!l.retired&&l.level===lesson.level).findIndex(l=>l.id===lesson.id)+1;title=lesson.title;}}
 else if(kind==='labels')title='그림에 이름표 붙이기';
 else if(kind==='listening'){number=2;title='듣고 사진 고르기';}
 else if(kind==='play'){number=4;title='카페에 남겨진 가방';}
 else if(kind==='sentence'||kind==='sentence-review'){number=sentenceLessons.findIndex(l=>l.id===sentenceId(s))+1;title=sentenceLessons[number-1].title;}
 else if(kind==='dialogue')title='따뜻한 커피를 포장해요';
 else if(kind==='reading'){number=Number(s.onboardingLevel)===6?2:1;title=Number(s.onboardingLevel)===7?'생각 나누기':Number(s.onboardingLevel)===6?'조건과 이유를 연결해 판단하기':'안내·메시지에서 정보 찾기';}
 return `${lessonNumberWithVideo(s,number)}. ${title}`;
}
