const locks = new WeakMap();

// Fix the document on iOS too; the dialog keeps its own scroll container.
export function showSheet(dialog) {
  if (dialog.open) return;
  const body = document.body;
  const x = window.scrollX, y = window.scrollY;
  const properties = ["position", "top", "left", "width", "overflow"];
  const previous = properties.map(key => [key, body.style.getPropertyValue(key), body.style.getPropertyPriority(key)]);
  let disposeDrag = () => {};
  const release = () => {
    if (dialog.open || locks.get(dialog) !== release) return;
    locks.delete(dialog);
    disposeDrag();
    dialog.removeEventListener("close", release);
    for (const [key, value, priority] of previous) {
      if (value) body.style.setProperty(key, value, priority);
      else body.style.removeProperty(key);
    }
    window.scrollTo({ left: x, top: y, behavior: "instant" });
  };
  Object.assign(body.style, { position: "fixed", top: `${-y}px`, left: `${-x}px`, width: "100%", overflow: "hidden" });
  locks.set(dialog, release);
  dialog.addEventListener("close", release);
  try { dialog.showModal(); disposeDrag = mountSheetDrag(dialog); }
  catch (error) { release(); throw error; }
}

export function closeSheet(dialog) {
  dialog.close();
  locks.get(dialog)?.();
}

// Only claim downward gestures that begin at the top of the scrollable content.
function mountSheetDrag(dialog) {
  let gesture;
  const previousTranslate = dialog.style.translate;
  const reset = () => { gesture = null; dialog.style.translate = previousTranslate; };
  const start = event => {
    reset();
    if(event.touches.length !== 1 || event.target.closest('button,a,input,textarea,select,canvas,summary,[contenteditable]')) return;
    for(let node=event.target; node && dialog.contains(node); node=node.parentElement) {
      if(node.scrollTop > 1) return;
      if(node===dialog) break;
    }
    if(dialog.scrollTop > 1) return;
    const touch=event.touches[0];
    gesture={x:touch.clientX,y:touch.clientY,distance:0,claimed:false};
  };
  const move = event => {
    if(!gesture) return;
    if(event.touches.length !== 1) { reset(); return; }
    const dx=event.touches[0].clientX-gesture.x,dy=event.touches[0].clientY-gesture.y;
    if(!gesture.claimed) {
      if(Math.abs(dx)<8 && Math.abs(dy)<8) return;
      if(dy<=0 || Math.abs(dx)>dy) { reset(); return; }
      gesture.claimed=true;
    }
    if(event.cancelable) event.preventDefault();
    gesture.distance=Math.max(0,dy);
    dialog.style.translate=`0 ${gesture.distance}px`;
  };
  const end = () => {
    const dismiss=gesture?.claimed && gesture.distance>=Math.min(120,dialog.clientHeight*.25);
    reset();
    if(dismiss && dialog.open) {
      // Reuse each sheet's existing cancellation/cleanup and focus handling.
      const allowed=dialog.dispatchEvent(new Event('cancel',{cancelable:true}));
      if(allowed && dialog.open) closeSheet(dialog);
    }
  };
  dialog.addEventListener('touchstart',start,{passive:true});
  dialog.addEventListener('touchmove',move,{passive:false});
  dialog.addEventListener('touchend',end);
  dialog.addEventListener('touchcancel',reset);
  return () => {reset();dialog.removeEventListener('touchstart',start);dialog.removeEventListener('touchmove',move);dialog.removeEventListener('touchend',end);dialog.removeEventListener('touchcancel',reset);};
}
