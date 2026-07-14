export type FloatingActionVisibilityInput = {
  bottomPadding?: number;
  inlineActionHeight: number | null;
  inlineActionTop: number | null;
  scrollOffsetY: number;
  viewportHeight: number;
};

export function isInlineActionFullyVisible({
  bottomPadding = 16,
  inlineActionHeight,
  inlineActionTop,
  scrollOffsetY,
  viewportHeight,
}: FloatingActionVisibilityInput) {
  if (inlineActionTop == null || inlineActionHeight == null || viewportHeight <= 0) {
    return false;
  }

  const viewportBottom = scrollOffsetY + viewportHeight;
  const inlineActionBottom = inlineActionTop + inlineActionHeight;

  return inlineActionBottom + bottomPadding <= viewportBottom;
}
