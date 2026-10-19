// Compare graphemes so emoji and combining marks stay intact in both languages.
export function correctionDiff(original, corrected) {
 const split=text=>[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(item=>item.segment);
 const a=split(original),b=split(corrected),width=b.length+1;
 const lengths=new Uint16Array((a.length+1)*width);
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)
  lengths[i*width+j]=a[i]===b[j]?1+lengths[(i+1)*width+j+1]:Math.max(lengths[(i+1)*width+j],lengths[i*width+j+1]);
 const parts=[];
 const append=(type,text)=>{const last=parts.at(-1);if(last?.type===type)last.text+=text;else parts.push({type,text});};
 let i=0,j=0;
 while(i<a.length||j<b.length){
  if(i<a.length&&j<b.length&&a[i]===b[j]){append('same',a[i++]);j++;}
  else if(i<a.length&&(j===b.length||lengths[(i+1)*width+j]>=lengths[i*width+j+1]))append('removed',a[i++]);
  else append('added',b[j++]);
 }
 return parts;
}

// Stored replies contain the corrected post. Hide untouched sentences around the edit.
export function correctedSentencePair(original, corrected, language) {
 const split=text=>[...new Intl.Segmenter(language,{granularity:'sentence'}).segment(text)].map(item=>item.segment);
 const before=split(original),after=split(corrected);
 let start=0,endBefore=before.length,endAfter=after.length;
 while(start<endBefore&&start<endAfter&&before[start].trim()===after[start].trim())start++;
 while(endBefore>start&&endAfter>start&&before[endBefore-1].trim()===after[endAfter-1].trim()){endBefore--;endAfter--;}
 return {original:before.slice(start,endBefore).join('').trim(),corrected:after.slice(start,endAfter).join('').trim()};
}
