import {esc} from './ui.js';
// Front of mouth is left. Filled area is the tongue; dot marks oral contact.
const shapes={
 a:'M68 145 C95 143 122 155 151 151 C184 147 205 142 217 159 L220 193 C178 179 120 184 81 163 Z',
 eo:'M68 145 C96 144 122 124 157 103 C187 85 205 105 217 155 L220 193 C178 179 120 184 81 163 Z',
 o:'M68 145 C96 144 125 116 158 94 C189 78 208 106 217 155 L220 193 C178 179 120 184 81 163 Z',
 u:'M68 145 C98 144 127 98 164 79 C194 66 209 105 217 155 L220 193 C178 179 120 184 81 163 Z',
 eu:'M68 145 C98 144 127 98 164 79 C194 66 209 105 217 155 L220 193 C178 179 120 184 81 163 Z',
 i:'M68 145 C79 118 91 81 120 76 C151 69 187 102 217 155 L220 193 C178 179 120 184 81 163 Z',
 e:'M68 145 C80 125 97 104 122 100 C155 95 188 119 217 155 L220 193 C178 179 120 184 81 163 Z',
 ae:'M68 145 C82 132 101 123 126 122 C161 122 190 133 217 155 L220 193 C178 179 120 184 81 163 Z',
 alveolar:'M68 145 C68 128 69 94 78 86 C90 87 90 117 114 126 C163 134 195 139 217 159 L220 193 C178 179 120 184 81 163 Z',
 palatal:'M68 145 C79 119 91 73 114 64 C133 65 137 110 163 124 C189 134 207 147 217 159 L220 193 C178 179 120 184 81 163 Z',
 velar:'M68 145 C111 148 146 115 184 75 C194 64 203 75 207 94 L220 193 C178 179 120 184 81 163 Z',
 sibilant:'M68 145 C72 125 77 99 87 99 C104 103 120 128 155 132 C185 135 206 148 217 159 L220 193 C178 179 120 184 81 163 Z'
};
shapes.tap=shapes.alveolar;shapes.bilabial=shapes.a;shapes.glottal=shapes.a;shapes.silent=shapes.a;
const positions={a:'舌を低く',eo:'舌の奥を中くらいに',o:'舌の奥を中くらいに',u:'舌の奥を高く',eu:'舌の奥を高く',i:'舌の前を高く',e:'舌の前を中くらいに',ae:'舌の前を低めに',alveolar:'上の歯ぐき',tap:'上の歯ぐきに軽く触れる',palatal:'上あごの前寄り',velar:'上あごの奥',sibilant:'歯ぐきの近くにすき間',bilabial:'両唇を閉じる',glottal:'口の中はふさがない',silent:'ㅇ自体の音は出さない'};
export function pronunciationDiagram(record,step=0){
 const pose=record.poses[step]||record.poses[0],rounded=['o','u'].includes(pose),closed=pose==='bilabial',contact={alveolar:[78,86],tap:[78,86],palatal:[114,64],velar:[190,72],bilabial:[44,125]}[pose];
 const lipLabel=closed?'閉じる':rounded?'丸める':pose==='a'?'開く':'丸めない';
 const lip=closed?'M274 117 Q305 93 336 117 Q305 137 274 117 M274 117 L336 117':rounded?'M286 117 C285 82 326 82 325 117 C326 151 285 151 286 117 M297 117 C297 99 314 99 314 117 C314 135 297 135 297 117':'M274 117 Q304 94 336 117 Q304 140 274 117 M282 117 Q305 105 328 117 Q305 128 282 117';
 const description=`口の左側が唇。${positions[pose]}。唇：${lipLabel}。${record.nasal?'鼻へ息を通す。':''}`;
 return `<svg class="pronunciation-diagram" viewBox="0 0 360 220" role="img" aria-label="${esc(description)}" xmlns="http://www.w3.org/2000/svg"><defs><marker id="pronunciation-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/></marker></defs><g class="mouth-outline"><path d="M67 20 L49 62 Q45 72 28 87 Q22 96 44 98 L44 113 M44 137 Q39 160 48 177 Q61 196 91 197 L112 210 M224 30 L232 210"/><path d="M44 106 L62 106 L66 91 Q75 86 83 85 Q105 58 137 57 Q169 56 190 72 Q204 82 215 110"/><path d="M44 145 L62 145 L68 160 Q116 188 174 182 L209 205"/><path class="tooth" d="M59 101 L70 100 L69 119 Q62 123 59 117 Z M61 143 L70 141 L74 158 L65 160 Z"/></g><path class="tongue-fill" d="${shapes[pose]}"/><path class="mouth-outline" d="${closed?'M36 125 Q45 119 53 125 Q45 132 36 125':rounded?'M44 109 Q21 107 27 119 L44 119 M44 132 L27 132 Q23 145 44 145':'M44 110 Q34 112 36 118 L44 118 M44 134 L36 134 Q34 142 44 144'}"/>${contact?`<circle class="mouth-contact" cx="${contact[0]}" cy="${contact[1]}" r="5"/>`:''}${record.nasal?'<path class="mouth-air" d="M220 172 L218 45 Q154 13 84 37 L41 73" marker-end="url(#pronunciation-arrow)"/>':record.aspirated?'<path class="mouth-air" d="M31 126 L5 126" marker-end="url(#pronunciation-arrow)"/><path class="mouth-air" d="M27 118 L7 111 M27 136 L7 144"/>':''}<g class="lip-inset"><text x="305" y="55">唇を正面から</text><path d="${lip}"/><text x="305" y="174">${lipLabel}</text></g></svg>`;
}
