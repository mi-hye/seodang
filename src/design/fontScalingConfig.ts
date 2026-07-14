export function getAppTextScale(fontScale: number) {
  if (fontScale <= 1) {
    return 1;
  }

  return Math.max(0.72, 0.92 / fontScale);
}

export function scaledFont(size: number, textScale: number) {
  return Math.round(size * textScale);
}
