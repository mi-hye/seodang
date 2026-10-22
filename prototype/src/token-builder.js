import {esc,phraseText} from './ui.js';
const tokenText=value=>phraseText(value.replaceAll('|',''),value.includes('|')?value.split('|'):undefined);
// Lessons own their saved state and events; every sentence builder shares token markup/layout.
export function renderTokenSelection({tokens,selected=[],locked=false,lang='ja',selectedAttributes,chipClass=''}){
 if(!selected.length)return '';
 return selected.map(id=>{
  const attributes=selectedAttributes?.(id),tag=attributes==null?'span':'button';
  return `<${tag} class="token-builder-chip ${chipClass}" lang="${esc(lang)}" ${tag==='button'?`type="button" ${attributes} ${locked?'disabled':''}`:''}>${tokenText(tokens[id])}</${tag}>`;
 }).join(' ');
}
export function renderTokenBuilder(options){
 const {tokens,selected=[],order=tokens.map((_,i)=>i),locked=false,lang='ja',choiceAttributes,answerClass='',choicesClass='',chipClass='',answerAttributes='',empty=''}=options;
 return `<div class="token-builder"><div class="token-builder-answer ${answerClass}" role="group" ${answerAttributes}${!answerAttributes.includes('aria-label')&&empty?` aria-label="${esc(empty)}"`:''} aria-live="polite">${renderTokenSelection(options)}</div><div class="token-builder-choices ${choicesClass}">${order.map(id=>`<button type="button" class="token-builder-chip ${chipClass}" lang="${esc(lang)}" ${choiceAttributes(id)} ${locked||selected.includes(id)?'disabled':''}>${tokenText(tokens[id])}</button>`).join('')}</div></div>`;
}
