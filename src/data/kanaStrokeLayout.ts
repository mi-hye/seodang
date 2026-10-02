import { kanaStrokes } from "./kanaStrokes.ts";
import type { KanjiVgStroke } from "../types/practice";

type Stroke = Omit<KanjiVgStroke, "id">;
const smallKana = "ァィゥェォャュョッ";
const round = (value: number) => Number(value.toFixed(3));

function transform(strokes: Stroke[], scale: number, x: number, y: number): Stroke[] {
  return strokes.map((stroke) => {
    let coordinate = 0;
    const pathLength = round(stroke.pathLength! * scale);
    return {
      ...stroke,
      // Generated kana paths contain only absolute M/L/C coordinate pairs.
      path: stroke.path.replace(/-?\d*\.?\d+/g, (value) => String(round(Number(value) * scale + (coordinate++ % 2 === 0 ? x : y)))),
      pathLength,
      start: { x: round(stroke.start.x * scale + x), y: round(stroke.start.y * scale + y) },
      end: { x: round(stroke.end.x * scale + x), y: round(stroke.end.y * scale + y) },
      // A scaled dakuten mark is a short stroke, not a full-size sweep.
      type: pathLength < 12 ? "dot" : stroke.type,
    };
  });
}

export function getKanaStrokes(literal: string): Stroke[] {
  const parts = [...literal];
  if (parts.length === 1) {
    const strokes = kanaStrokes[literal];
    return smallKana.includes(literal) ? transform(strokes, 0.65, 30, 30) : strokes;
  }
  // Two square character cells, centered vertically in the existing square
  // canvas. Small kana occupy the lower-right of the second cell.
  return parts.flatMap((part, index) => {
    const small = smallKana.includes(part);
    return transform(kanaStrokes[part], small ? 0.312 : 0.48, index * 50 + (small ? 16 : 1), small ? 43 : 26);
  }).map((stroke, index) => ({ ...stroke, order: index + 1 }));
}
