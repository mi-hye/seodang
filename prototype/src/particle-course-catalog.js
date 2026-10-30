// Stable lesson IDs; only unfinished legacy particle content is restarted.
export const particleContentVersion=2;
export const legacyParticleChoices={"25-1":{"choiceCounts":[2,2,2],"answers":[0,1,1]},"25-2":{"choiceCounts":[2,2,3],"answers":[1,0,2]},"25-3":{"choiceCounts":[2,2,2],"answers":[0,1,1]},"25-4":{"choiceCounts":[2,2,3],"answers":[1,0,2]},"25-5":{"choiceCounts":[2,2,2],"answers":[0,1,1]},"25-6":{"choiceCounts":[2,2,3],"answers":[1,0,2]},"25-7":{"choiceCounts":[3,2,2],"answers":[0,1,1]},"25-8":{"choiceCounts":[2,3,3],"answers":[1,0,2]},"25-9":{"choiceCounts":[2,2,2],"answers":[0,1,1]},"25-10":{"choiceCounts":[2,2,2],"answers":[1,0,1]}};
export const particleCourseCatalog=[
 {
  "id": "25-1",
  "title": "은/는 と 이/가 · 話題とだれ・何",
  "titleParts": [
   "은/는 と 이/가",
   " · ",
   "話題とだれ・何"
  ],
  "level": 9,
  "count": 3,
  "choiceCounts": [
   2,
   2,
   2
  ],
  "answers": [
   0,
   1,
   1
  ]
 },
 {
  "id": "25-2",
  "title": "은/는 と 을/를 · 比べると変わる",
  "titleParts": [
   "은/는 と 을/를",
   " · ",
   "比べると変わる"
  ],
  "level": 9,
  "count": 3,
  "choiceCounts": [
   2,
   2,
   2
  ],
  "answers": [
   0,
   1,
   1
  ]
 },
 {
  "id": "25-3",
  "title": "이/가 と 을/를 · 後ろの言葉で選ぶ",
  "titleParts": [
   "이/가 と 을/를",
   " · ",
   "後ろの言葉で選ぶ"
  ],
  "level": 9,
  "count": 3,
  "choiceCounts": [
   2,
   2,
   2
  ],
  "answers": [
   0,
   1,
   1
  ]
 },
 {
  "id": "25-4",
  "title": "에 と 에서 · 居場所とする場所",
  "titleParts": [
   "에 と 에서",
   " · ",
   "居場所とする場所"
  ],
  "level": 9,
  "count": 3,
  "choiceCounts": [
   2,
   2,
   2
  ],
  "answers": [
   1,
   0,
   1
  ]
 },
 {
  "id": "25-5",
  "title": "에 と 에서 · 着く先と来た場所",
  "titleParts": [
   "에 と 에서",
   " · ",
   "着く先と来た場所"
  ],
  "level": 9,
  "count": 3,
  "choiceCounts": [
   2,
   2,
   2
  ],
  "answers": [
   0,
   1,
   1
  ]
 },
 {
  "id": "25-6",
  "title": "에・에서・(으)로 · 場所と手段",
  "titleParts": [
   "에・에서・(으)로",
   " · ",
   "場所と手段"
  ],
  "level": 9,
  "count": 3,
  "choiceCounts": [
   2,
   2,
   2
  ],
  "answers": [
   1,
   0,
   1
  ]
 },
 {
  "id": "25-7",
  "title": "한테 と 하고 · 相手の役割",
  "titleParts": [
   "한테 と 하고",
   " · ",
   "相手の役割"
  ],
  "level": 9,
  "count": 3,
  "choiceCounts": [
   2,
   2,
   2
  ],
  "answers": [
   0,
   1,
   1
  ]
 },
 {
  "id": "25-8",
  "title": "한테 と 한테서 · 渡す向き",
  "titleParts": [
   "한테 と 한테서",
   " · ",
   "渡す向き"
  ],
  "level": 9,
  "count": 3,
  "choiceCounts": [
   2,
   2,
   2
  ],
  "answers": [
   1,
   0,
   1
  ]
 },
 {
  "id": "25-9",
  "title": "한테・에게・께 · 意味と敬意",
  "titleParts": [
   "한테・에게・께",
   " · ",
   "意味と敬意"
  ],
  "level": 9,
  "count": 3,
  "choiceCounts": [
   2,
   2,
   2
  ],
  "answers": [
   0,
   1,
   1
  ]
 },
 {
  "id": "25-10",
  "title": "은/는・도・만 · 話題・追加・限定",
  "titleParts": [
   "은/는・도・만",
   " · ",
   "話題・追加・限定"
  ],
  "level": 9,
  "count": 3,
  "choiceCounts": [
   2,
   2,
   2
  ],
  "answers": [
   1,
   0,
   1
  ]
 },
 {id:'25-11',title:'에・부터・까지 · 時刻と始まり・終わり',titleParts:['에・부터・까지',' · ','時刻と始まり・終わり'],level:9,count:3,choiceCounts:[2,2,2],answers:[0,1,1]},
 {id:'25-12',title:'만 と 밖에 · だけ・しか',titleParts:['만 と 밖에',' · ','だけ・しか'],level:9,count:3,choiceCounts:[2,2,2],answers:[0,1,1]},
 {id:'25-13',title:'보다・만큼・처럼 · 比べ方の違い',titleParts:['보다・만큼・처럼',' · ','比べ方の違い'],level:9,count:3,choiceCounts:[2,2,2],answers:[0,1,1]}
];
export const isParticleCourse=id=>particleCourseCatalog.some(lesson=>lesson.id===id);
