import { esc } from './ui.js';
// Ported from src/components/practice/WritingCanvas.tsx: grid, rounded strokes,
// relative coordinates and stroke-level undo. Drafts are session-only, not scores.
const drafts = new Map();
export function writingMarkup(letter) {
  return `<div class="kana-writing" data-writing-letter="${esc(letter.id)}" data-writing-text="${esc(letter.text)}"${letter.strokeSource?` data-stroke-source="${esc(letter.strokeSource)}"`:""}><div class="writing-board"><span class="writing-guide" lang="ja" aria-hidden="true">${esc(letter.text)}</span><div class="stroke-layer"></div><span class="stroke-status" role="status"></span><canvas aria-label="${esc(letter.text)} 글자 쓰기 연습장">${esc(letter.text)} 글자 쓰기 연습장</canvas></div><div class="writing-tools"><button type="button" data-writing="strokes" disabled>획순 보기</button><button type="button" data-writing="undo">한 획 지우기</button><button type="button" data-writing="clear">모두 지우기</button></div></div>`;
}
export function relativePoint(event, rect) {
  const clamp = n => Math.max(0, Math.min(1,n));
  return {x:clamp((event.clientX-rect.left)/Math.max(rect.width,1)),y:clamp((event.clientY-rect.top)/Math.max(rect.height,1))};
}
export function mountWriting(root) {
  const box = root.querySelector('[data-writing-letter]');
  if (!box) return () => {};
  let disposed=false,disposeStrokes;
  import('./kana-strokes.js').then(({mountStrokes})=>{if(!disposed)mountStrokes(box,{autoPlay:strokes.length===0,onReady:dispose=>{disposeStrokes=dispose;}});}).catch(()=>{});
  const key = box.dataset.writingLetter;
  if (!drafts.has(key)) drafts.set(key,[]);
  const strokes = drafts.get(key), canvas = box.querySelector('canvas'), ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  let pointer = null, stroke = null, side = 0;
  const undo = box.querySelector('[data-writing="undo"]'), clear = box.querySelector('[data-writing="clear"]');
  const draw = () => {
    ctx.clearRect(0,0,side,side);
    ctx.strokeStyle = '#173221';ctx.fillStyle = '#173221';ctx.lineWidth = 6;ctx.lineCap = 'round';ctx.lineJoin = 'round';
    for (const points of strokes) {
      if (!points.length) continue;
      if(points.length === 1){ctx.beginPath();ctx.arc(points[0].x*side,points[0].y*side,3,0,Math.PI*2);ctx.fill();continue;}
      ctx.beginPath();ctx.moveTo(points[0].x*side,points[0].y*side);
      for(const p of points.slice(1))ctx.lineTo(p.x*side,p.y*side);
      ctx.stroke();
    }
    undo.disabled = clear.disabled = strokes.length === 0;
  };
  const resize = () => {
    side = canvas.getBoundingClientRect().width;
    const ratio = Math.min(globalThis.devicePixelRatio || 1,3);
    canvas.width = Math.round(side*ratio);canvas.height = Math.round(side*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);draw();
  };
  const down = event => {
    if(box.dataset.strokeDemo==='true')return;
    if(pointer !== null || event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0))return;
    event.preventDefault();pointer=event.pointerId;stroke=[relativePoint(event,canvas.getBoundingClientRect())];
    strokes.push(stroke);canvas.setPointerCapture(pointer);draw();
  };
  const move = event => {
    if(event.pointerId !== pointer || !stroke)return;
    event.preventDefault();
    const rect=canvas.getBoundingClientRect(),events=event.getCoalescedEvents?.() || [];
    for(const e of events.length ? events : [event]){
      const point=relativePoint(e,rect),last=stroke.at(-1);
      if(Math.hypot(point.x-last.x,point.y-last.y)*side >= 1.5)stroke.push(point);
    }
    draw();
  };
  const end = event => {
    if(event.pointerId !== pointer)return;
    if(event.type === 'pointerup')move(event);
    const id=pointer;pointer=null;stroke=null;
    if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  };
  const click = event => {
    const action=event.target.closest('[data-writing]')?.dataset.writing;
    if(!action || pointer !== null)return;
    if(action==='undo')strokes.pop();
    if(action==='clear')strokes.length=0;
    draw();
  };
  canvas.addEventListener('pointerdown',down);
  canvas.addEventListener('pointermove',move);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,end);
  box.addEventListener('click',click);
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  return () => {
    disposed=true;disposeStrokes?.();observer.disconnect();
    canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);
    for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.removeEventListener(type,end);
    box.removeEventListener('click',click);
    if(pointer !== null && canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);
  };
}
