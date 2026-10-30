// Retained only for saved-progress compatibility. Korean level 1 ends at batchim (10 lessons).
export const courseOneCatalog=[
 ['母音をつないで読む','모음을 이어 읽어요'],
 ['濃音を含む単語を読む','된소리가 들어간 단어를 읽어요'],
 ['パッチムのある単語を読む','받침이 있는 단어를 읽어요'],
 ['複合母音を単語で読む','복합 모음을 단어로 읽어요'],
 ['街の表示を読む','거리의 표지판을 읽어요'],
 ['つながる音を聞く','이어지는 소리를 들어요'],
 ['短いあいさつを読む','짧은 인사말을 읽어요']
].map(([ja,ko],i)=>({id:`course1-${i+11}`,level:0,retired:true,directions:['ja-ko'],titles:[ko,ja],count:3,number:{'ja-ko':i+11},answers:[[1,0,0],[2,1,0],[0,2,1],[1,1,2],[2,0,2],[0,1,2],[2,2,0]][i],extended:true}));
