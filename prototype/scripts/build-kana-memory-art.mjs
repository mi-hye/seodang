// Original, editable teaching pictograms. Concepts follow the researched tips;
// no third-party illustrations are copied. Run from prototype/.
import { mkdir, writeFile } from 'node:fs/promises';
const path = (d, color = '#c68132', width = 5) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const shape = (d, fill = '#f2ce92') => `<path d="${d}" fill="${fill}" stroke="#705644" stroke-width="2.5" stroke-linejoin="round"/>`;
const circle = (x,y,r,fill='#f2ce92') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#705644" stroke-width="2.5"/>`;
const line = d => path(d,'#705644',2.5);
const text = (s,x,y,size=38) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="${size}" font-weight="600" fill="#c68132">${s}</text>`;
const art = {
 a: ['다리를 포개고 앉은 사람', circle(50,22,10)+shape('M36 36Q50 29 64 36L68 60H32Z','#a6b6a0')+path('M24 43H76M50 34V62')+shape('M32 60Q9 77 31 84L70 66Q91 73 71 85L30 68')+path('M30 68Q59 93 72 72M67 63Q26 91 25 73')],
 i: ['두 줄로 된 숫자 Ⅱ', path('M33 20V81M67 20V72', '#c68132',9)+line('M22 20H44M22 81H44M56 20H78M56 72H78')],
 u: ['우의 둥근 윗부분과 굽은 아랫부분', circle(50,27,12)+path('M23 50H78Q67 76 42 83M50 53V77')],
 e: ['팔과 다리를 펼친 에어로빅 자세', circle(53,18,9)+path('M23 36L71 32M51 31L43 57L24 82M44 57L68 80L85 79', '#c68132',7)+shape('M43 34L58 34L53 55L42 57Z','#a6b6a0')],
 o: ['긴 목과 둥근 몸통이 있는 오리', shape('M18 67Q20 46 48 54L48 32Q45 16 60 16Q77 15 73 30L62 36L64 56Q91 65 73 80Q35 94 18 67Z')+shape('M73 23L87 28L72 31Z','#d3944d')+circle(64,24,1.5,'#705644')+path('M31 61Q48 49 60 64Q66 79 47 80M49 36V65')+shape('M83 43Q74 54 83 56Q93 56 83 43Z','#a8c5cc')],
 ka: ['손잡이와 길게 뻗은 칼날', shape('M37 37L54 43L29 86L24 70Z','#b3c7c9')+shape('M44 14L58 18L50 38L36 34Z')+path('M28 35L64 46M44 38L29 80M74 25L82 39')],
 ki: ['두 개의 이빨이 달린 열쇠', circle(49,75,13)+path('M49 62V16M49 25H74M49 40H74', '#c68132',8)+circle(49,75,4,'#fcf7ef')],
 ku: ['왼쪽 모서리가 꺾인 쿠션', shape('M50 13L87 47L53 87L14 48Z','#a6b6a0')+line('M50 23L76 48L53 77L25 48Z')+path('M50 13L14 48L53 87')],
 ke: ['마이크 옆에서 양팔을 벌린 가수', circle(63,21,9)+path('M41 40H86M64 34V65L51 86M64 65L79 86', '#c68132',6)+line('M23 31V87M14 87H32')+shape('M17 18Q23 10 29 18V29Q23 37 17 29Z','#a6b6a0')],
 ko: ['옆에서 본 콧등과 코끝', line('M42 12Q49 27 45 36L28 62Q26 68 42 68L48 76M47 86H66')+path('M45 36L29 60M29 68Q40 68 49 74')+circle(46,66,2,'#705644')],
 sa: ['아이를 맞이하며 팔을 벌린 사람', circle(51,21,9)+shape('M41 34L59 34L66 57L37 60Z','#a6b6a0')+path('M21 39H77M52 33L58 58M45 65Q24 79 48 83H71', '#c68132',6)],
 shi: ['끝이 오른쪽으로 굽은 낚싯바늘', line('M31 7V23')+circle(31,26,5,'#fcf7ef')+path('M31 32V65Q31 88 52 88Q74 88 75 64L66 74', '#c68132',7)],
 su: ['작은 고리가 감긴 스프링', line('M20 22H79')+path('M24 28H76M53 28V46Q31 42 36 58Q48 74 62 55Q67 47 54 42M54 64L45 88', '#c68132',6)],
 se: ['수도꼭지와 둥근 세면대', shape('M16 47H86Q81 77 52 78Q22 77 16 47Z','#b3c7c9')+path('M17 46H85M34 26V63Q34 70 69 70M65 19V49')+line('M55 21H72M44 78V88H61V77')],
 so: ['뿔과 둥근 주둥이가 있는 소 얼굴', shape('M31 31L17 18Q17 39 29 45L22 56Q23 88 51 89Q80 88 79 56L71 45Q85 36 83 18L68 32Z')+shape('M30 61Q51 49 73 62L72 78Q49 95 30 78Z','#deb1a1')+circle(36,50,2,'#705644')+circle(65,50,2,'#705644')+path('M28 29L45 20L35 37H75M67 48Q32 51 34 72Q38 85 63 79')],
 ta: ['긴 목과 둥근 배를 가진 타조', circle(30,22,9)+shape('M19 21L9 26L22 27Z')+path('M29 30L28 62M17 45H43')+shape('M35 48Q72 35 79 61Q77 79 42 75Z','#a6b6a0')+path('M48 51H69M44 72H71')+line('M49 77L44 92M65 77L69 92')],
 chi: ['칠을 뜻하는 七과 굽은 꼬리', text('七',48,57,54)+path('M57 59Q83 76 53 89')],
 tsu: ['안쪽으로 둥글게 말리는 파도', shape('M12 81Q22 64 38 45Q61 16 85 32Q62 27 59 49Q59 63 74 70L89 81Z','#a8c5cc')+path('M19 32Q89 19 79 52Q69 77 39 77')+line('M15 88H86')],
 te: ['평평한 상판과 휘어진 테이블 다리', shape('M13 24H88L81 35H19Z')+path('M17 30H80Q52 39 53 58Q53 78 74 83')+line('M27 36V82M20 83H36')],
 to: ['위로 솟은 귀와 둥근 토끼 얼굴', shape('M36 43Q13 3 29 12L49 40Q59 4 70 12Q76 21 63 44Q87 64 73 82Q49 98 28 81Q17 62 36 43Z','#ead7bd')+path('M38 17L48 39M66 43Q30 43 30 66Q30 84 66 81')+circle(40,61,2,'#705644')+circle(64,61,2,'#705644')+shape('M48 70H56L52 75Z','#d7a394')],
 na: ['꽃으로 날아가는 나비', shape('M27 34Q3 9 12 50Q8 76 30 58Q55 79 48 48Q53 17 27 34Z','#a6b6a0')+path('M11 41H43M27 25L26 61')+circle(76,31,12,'#e4b5a0')+circle(76,31,4)+path('M76 45V70Q51 63 56 79Q73 93 82 77')],
 ni: ['줄로 연결된 두 뜨개바늘', path('M43 30H86M43 66H86', '#c68132',6)+line('M42 30Q15 28 16 49Q16 67 42 66')+shape('M30 36H68V59H30Z','#a6b6a0')+line('M35 37V57M43 37V57M51 37V57M59 37V57')],
 nu: ['눈 끝에 작은 눈물방울', shape('M10 50Q49 12 87 50Q49 87 10 50Z','#fffaf0')+circle(48,50,15,'#a6b6a0')+line('M20 38L14 28M35 29L32 18M59 28L64 17')+shape('M81 63Q65 81 80 88Q98 85 81 63Z','#a8c5cc')+path('M79 69Q68 82 79 84Q91 82 83 73')],
 ne: ['꼬리를 둥글게 만 고양이', shape('M30 41L30 15L44 25L56 17L64 41Q81 57 78 80H25Q15 67 30 41Z','#a6b6a0')+circle(39,37,2,'#705644')+circle(53,37,2,'#705644')+path('M30 19V79M24 46L51 37Q78 45 74 70Q60 90 55 77Q55 64 80 72')+line('M38 79V65M45 46L41 50')],
 no: ['빗금이 있는 금지 표지판', circle(50,50,32,'#fcf7ef')+path('M29 72L71 28', '#c68132',8)],
 ha: ['H와 a를 결합한 모양', text('H',31,68,55)+text('a',71,76,55)],
 hi: ['양끝이 올라간 웃는 입', circle(30,28,3,'#705644')+circle(72,28,3,'#705644')+shape('M20 46Q49 61 81 44Q79 86 50 86Q21 84 20 46Z','#e4b5a0')+path('M13 42L26 46Q22 82 49 84Q78 86 74 46L86 42')],
 fu: ['입을 오므려 바람을 부는 얼굴', circle(44,49,32,'#ead7bd')+line('M26 42L35 40M55 40L63 42')+path('M42 48Q59 50 45 58Q62 62 43 69')+path('M74 46H88M74 58H94M73 70H88','#8aaeb7',3)],
 he: ['물 밖으로 꺾어 올린 팔꿈치', shape('M16 62L41 26Q47 19 54 27L84 67L74 76L48 43L27 72Z','#ead7bd')+path('M19 62L48 30L82 68', '#c68132',6)+line('M10 83Q20 76 30 83T50 83T70 83T90 83')],
 ho: ['이마에 두 줄무늬가 있는 호랑이', circle(26,25,12)+circle(74,25,12)+shape('M21 31Q50 13 79 31L81 70Q50 98 19 70Z')+path('M36 34H64M36 46H64M50 28V56')+circle(34,59,3,'#705644')+circle(66,59,3,'#705644')+shape('M42 71Q50 66 58 71L50 78Z','#705644')+line('M20 49L29 53M80 49L72 53')],
 ma: ['줄기 아래 달린 고구마', shape('M40 64Q12 75 29 88Q55 95 65 73Q58 61 40 64Z','#b77870')+path('M49 17V67M28 30H69M28 47H69M50 66Q26 61 30 79Q36 91 59 76')+shape('M29 30Q17 13 44 25Z','#a6b6a0')+shape('M66 46Q84 31 54 40Z','#a6b6a0')],
 mi: ['다리를 들고 미끄러지는 사람', circle(76,39,9)+path('M67 47L38 70L24 47L32 23M39 70L64 82M59 53L78 67', '#c68132',7)+shape('M16 81Q28 64 31 83Q40 69 48 88Q27 91 16 81Z')],
 mu: ['팔을 벌리고 무릎을 꿇은 사람', circle(49,19,9)+shape('M38 34H61L65 60H34Z','#a6b6a0')+path('M19 40H59M74 34L86 39M47 33V59Q22 58 29 76Q36 86 51 80L74 80L76 66', '#c68132',6)],
 me: ['눈물 고리가 없는 눈', shape('M10 51Q49 11 89 51Q49 89 10 51Z','#fffaf0')+circle(48,51,15,'#a6b6a0')+line('M20 38L14 28M35 28L32 17M60 28L65 17')+path('M23 31L39 72M61 23Q11 47 27 70Q44 85 77 60')],
 mo: ['두 줄무늬와 고무줄이 있는 모자', shape('M46 11L83 65Q49 82 14 65Z','#a6b6a0')+path('M27 42H65M20 56H75M46 15V74Q47 94 66 85')],
 ya: ['기울어진 야자수', path('M55 28L37 88', '#c68132',8)+shape('M52 31Q17 8 10 35Q32 26 50 36M53 31Q77 2 89 22Q69 23 54 38M52 34Q89 28 88 53Q71 37 51 39Z','#a6b6a0')+path('M23 40Q75 15 80 38Q79 51 66 48M63 10L73 17')],
 yu: ['가운데 창살이 있는 둥근 유리창', shape('M18 22Q50 8 82 25V79Q50 94 18 77Z','#b3c7c9')+path('M20 23V77M52 15V85M22 42Q91 8 81 58Q68 83 26 62')],
 yo: ['돛대와 둥근 배가 있는 요트', shape('M47 20V63H79Z','#a6b6a0')+shape('M15 66H87Q77 89 52 89Q25 89 15 66Z')+path('M49 13V74Q28 63 27 77Q34 92 50 80M49 36H73')+line('M12 94H89')],
 ra: ['불꽃이 있는 라이터를 쥔 손', shape('M31 35H62V80H31Z','#a6b6a0')+shape('M46 9Q27 32 48 33Q66 29 46 9Z')+shape('M22 74Q12 60 22 56L40 68L60 59Q83 56 84 71Q81 90 38 90Z','#ead7bd')+path('M38 20L52 26M34 40L32 66Q79 44 77 73Q76 85 45 85')],
 ri: ['길이가 다른 리본 두 가닥', shape('M47 25Q20 4 16 26Q19 49 45 34M53 25Q80 4 85 26Q83 49 55 34Z','#a6b6a0')+circle(50,29,7)+path('M43 37L29 68M56 37L66 87', '#c68132',10)],
 ru: ['주머니가 보이는 캥거루', shape('M43 28L37 8L48 20L58 8L60 30L73 36L59 44Q83 65 68 80L88 88L59 85L46 91H23L43 74Q28 57 43 40L30 37Z')+shape('M45 62Q67 58 66 74Q59 87 46 78Z','#ead7bd')+path('M46 62Q69 58 65 75Q53 86 47 73Z')+circle(55,32,2,'#705644')],
 re: ['출발을 준비하며 웅크린 달리기 선수', circle(26,39,9)+path('M37 45L59 32L77 48L64 69L86 84M59 32L42 62L24 82M40 46L32 79', '#c68132',7)+line('M13 88H91')],
 ro: ['흘려 쓴 로와 끝이 열린 곡선', text('로',26,40,26)+path('M45 30H78L50 55Q86 42 82 68Q79 86 52 84')],
 wa: ['와 하고 크게 벌린 입의 옆얼굴', line('M39 11Q50 24 44 32L26 47L43 51M38 85L29 96')+path('M46 55Q76 40 79 62Q83 89 48 88M36 54V87')+circle(54,31,2,'#705644')],
 wo: ['둥근 오르골 위의 무용수', shape('M15 71Q49 58 85 71V85Q49 98 15 85Z','#a6b6a0')+circle(50,15,7)+path('M28 30H72M49 24L43 49L54 64M45 46L30 60')+shape('M41 39L59 43L66 52H31Z','#e4b5a0')+path('M82 66Q21 65 23 80Q33 89 72 84')],
 n: ['길게 이어 쓴 알파벳 n', text('n',25,33,24)+path('M48 21L25 80Q44 42 56 50Q65 53 59 69Q56 92 84 72', '#c68132',7)],
};
await mkdir('assets/kana-memory',{recursive:true});
const manifest={};
for(const [id,[alt,body]] of Object.entries(art)){
 const src=`assets/kana-memory/${id}-v1.svg`;
 await writeFile(src,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="16" fill="#fcf7ef"/>${body}</svg>\n`);
 manifest[id]={src,alt};
}
await writeFile('src/kana-memory-art.js',`// Original SVG assets; replace each src independently. Loaded only with kana.js.\nexport const kanaMemoryArt = ${JSON.stringify(manifest,null,2)};\n`);
console.log(`Saved ${Object.keys(art).length} original SVG memory aids.`);
