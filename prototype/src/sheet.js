const locks = new WeakMap();

// Fix the document on iOS too; the dialog keeps its own scroll container.
export function showSheet(dialog) {
  if (dialog.open) return;
  const body = document.body;
  const x = window.scrollX, y = window.scrollY;
  const properties = ["position", "top", "left", "width", "overflow"];
  const previous = properties.map(key => [key, body.style.getPropertyValue(key), body.style.getPropertyPriority(key)]);
  const release = () => {
    if (dialog.open || locks.get(dialog) !== release) return;
    locks.delete(dialog);
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
  try { dialog.showModal(); }
  catch (error) { release(); throw error; }
}

export function closeSheet(dialog) {
  dialog.close();
  locks.get(dialog)?.();
}
