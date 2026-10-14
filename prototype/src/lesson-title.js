import {kanaLessons} from './kana-state.js';
import {basicLessons} from './basics-state.js';
import {koreanLessons} from './korean-state.js';
export function lessonTitle(s,kind,fallback=''){
 let number=1,title=fallback.replace(/^\d+-\d+ · /,'');
 if(kind==='kana'){number=(s.kana?.active||0)+1;title=kanaLessons[number-1].caseTitle;}
 else if(kind==='basic'){const id=s.basics?.active||6;number=id===6?3:id-1;title=basicLessons.find(l=>l.id===id)?.title||title;}
 else if(kind==='korean'){const lesson=koreanLessons.find(l=>l.id===s.korean?.active);if(lesson){number=koreanLessons.filter(l=>l.level===lesson.level).findIndex(l=>l.id===lesson.id)+1;title=lesson.title;}}
 else if(kind==='labels')title='그림에 이름표 붙이기';
 else if(kind==='listening'){number=2;title='듣고 사진 고르기';}
 else if(kind==='play')title='카페에 남겨진 가방';
 else if(kind==='sentence'||kind==='sentence-review')title='가방 주인을 찾아요';
 else if(kind==='dialogue')title='카페에서 주문하기';
 else if(kind==='reading')title=Number(s.onboardingLevel)===7?'行間を聴く':Number(s.onboardingLevel)===6?'読んで、考える':'글을 읽고 핵심 찾기';
 return `${number}. ${title}`;
}
