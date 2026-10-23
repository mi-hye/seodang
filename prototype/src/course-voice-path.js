// Stable content identity for bundled, original lesson speech. The generation
// script additionally checks collisions and records the file's SHA-256.
export function courseVoicePath(locale,text){
 const hash=(value,seed)=>{let n=seed;for(const ch of value)n=Math.imul(n^ch.codePointAt(0),16777619)>>>0;return n.toString(16).padStart(8,'0');};
 return `assets/course-voices/${locale}-${hash(text,2166136261)}${hash(text,3335557771)}.m4a`;
}
