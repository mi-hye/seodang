type PracticePortraitLayoutInput = {
  height: number;
  width: number;
};

const SCREEN_HORIZONTAL_PADDING = 40;
const SCREEN_VERTICAL_PADDING = 48;
const COMPACT_HEIGHT_THRESHOLD = 740;
const MIN_CANVAS_SIDE = 220;

export function getPracticePortraitLayout({
  height,
  width,
}: PracticePortraitLayoutInput) {
  const isCompactPortrait = height < COMPACT_HEIGHT_THRESHOLD;
  const canvasCardPadding = isCompactPortrait ? 10 : 18;
  const headerHeight = isCompactPortrait ? 126 : 170;
  const toolbarHeight = isCompactPortrait ? 52 : 60;
  const actionHeight = isCompactPortrait ? 48 : 58;
  const verticalGaps = isCompactPortrait ? 30 : 56;
  const availableCanvasWidth =
    width - SCREEN_HORIZONTAL_PADDING - canvasCardPadding * 2;
  const availableCanvasHeight =
    height -
    SCREEN_VERTICAL_PADDING -
    headerHeight -
    toolbarHeight -
    actionHeight -
    verticalGaps -
    canvasCardPadding * 2;
  const canvasSideLength = clamp(
    Math.floor(Math.min(availableCanvasWidth, availableCanvasHeight)),
    MIN_CANVAS_SIDE,
    Math.floor(availableCanvasWidth),
  );

  return {
    canvasCardPadding,
    canvasSideLength,
    estimatedContentHeight:
      SCREEN_VERTICAL_PADDING +
      headerHeight +
      toolbarHeight +
      actionHeight +
      verticalGaps +
      canvasCardPadding * 2 +
      canvasSideLength,
    isCompactPortrait,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
