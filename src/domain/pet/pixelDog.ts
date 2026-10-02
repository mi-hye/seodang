import { PET_APPEARANCES } from "./petAppearance.ts";

type Point = readonly [number, number];
type PixelPath = { color: string; d: string };
export type DogSprite = { resolution: number; body: PixelPath[]; tail: PixelPath[] };

const palette: Record<string, string> = {
  X: "#644B3E", O: "#D99D5E", P: "#E8A89C", C: "#FFF3D9",
  S: "#BA7C49", L: "#EDB979", H: "#FFE0A5", D: "#382E2B",
  W: "#FFFCF0", M: "#E9D4B0", R: "#CD897C",
};
// Preserve the original 24px dog as the first milestone.
const original = [
  "...XX..........XX.....", "..XOOX........XOOX....", "..XPOOX......XOOPX....",
  "..XPOOOXXXXXXOOOPX....", "..XOOOOOOOOOOOOOOX....", "..XOOCCOOOOOOCCOOX....",
  "..XOOOOOOOOOOOOOOX....", "..XOOXXOOOOOOXXOOX....", "..XCOXXCOOOOCXXOCX....",
  "..XCCCCCXXXCCCCCCX....", "...XCCCCXXXCCCCCX.....", "....XCCCCXCCCCCX......",
  ".....XXXCCCXXXX.......", ".....XOOCCCOOX..XXX...", "....XOOCCCCCOOXXOOOX..",
  "....XOOCCCCCOOXOXXOX..", "....XOOCCCCCOOXOOXOX..", "....XOOCCCCCOOXOXOOX..",
  "....XOOOOOOOOOXXXXXX..", "....XCCXXOOXXCCX......", ".....XX..XX..XX.......",
];

const ellipse = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) =>
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
function polygon(x: number, y: number, points: readonly Point[]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}
function line(x: number, y: number, a: Point, b: Point, thickness: number) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
  return (x - a[0] - t * dx) ** 2 + (y - a[1] - t * dy) ** 2 <= thickness ** 2;
}
const leftEar: Point[] = [[3, 9], [3.4, 2], [8.1, 6.4]];
const rightEar: Point[] = [[13, 6.4], [17.7, 2], [18.1, 9]];
const leftInner: Point[] = [[4.1, 7.8], [4.2, 3.6], [7.1, 6.5]];
const rightInner: Point[] = [[14.1, 6.5], [16.9, 3.6], [17.1, 7.8]];

// Draw onto a genuinely denser integer grid at each milestone, not an enlarged
// low-resolution bitmap. Fine highlights, fur and paws use sub-24px features.
function bodyPixel(x: number, y: number, stage: number, happy: boolean) {
  let c = ".";
  if (ellipse(x, y, 10.5, 18.5, 5.1, 4.1)) {
    c = ellipse(x, y, 10.5, 18.4, 4.5, 3.6) ? "O" : "X";
    if (stage >= 3 && x > 13 && c === "O") c = "S";
    if (ellipse(x, y, 10.5, 17.6, 2.9, 3.4)) c = stage >= 3 && x > 11.8 ? "M" : "C";
  }
  for (const footX of [7.4, 13.6]) {
    if (ellipse(x, y, footX, 21.8, 1.9, 1.05)) c = "X";
    if (ellipse(x, y, footX, 21.6, 1.4, 0.7)) c = "C";
    if (stage >= 4 && y > 21.7 && y < 22.1 && (Math.abs(x - footX + 0.45) < 0.12 || Math.abs(x - footX - 0.45) < 0.12)) c = "M";
  }
  if (polygon(x, y, leftEar) || polygon(x, y, rightEar)) c = "X";
  if (polygon(x, y, leftInner) || polygon(x, y, rightInner)) c = "P";
  if (stage >= 4 && ((polygon(x, y, leftInner) && x < 4.8) || (polygon(x, y, rightInner) && x > 16.2))) c = "R";
  if (ellipse(x, y, 10.5, 9.7, 7.65, 6.1)) {
    c = "X";
    if (ellipse(x, y, 10.5, 9.45, 7.05, 5.65)) {
      c = "O";
      if (stage >= 3 && x > 14.5) c = "S";
      if (stage >= 3 && ellipse(x, y, 8, 6.8, 3.9, 1.9)) c = "L";
      if (ellipse(x, y, 10.5, 12, 6.1, 2.75)) c = stage >= 3 && y > 13.5 ? "M" : "C";
      if (ellipse(x, y, 6.8, 10.8, 2.1, 1.4) || ellipse(x, y, 14.2, 10.8, 2.1, 1.4)) c = "C";
    }
    for (const eyeX of [7, 14]) {
      if (ellipse(x, y, eyeX, 7.35, 1.1, 0.45)) c = "C";
      if (happy) {
        if (line(x, y, [eyeX - 0.7, 9.5], [eyeX, 9.05], 0.22) || line(x, y, [eyeX, 9.05], [eyeX + 0.7, 9.5], 0.22)) c = "D";
      } else {
        if (ellipse(x, y, eyeX, 9.45, 0.7, 0.9)) c = "D";
        if (stage >= 3 && ellipse(x, y, eyeX - 0.18, 9.12, 0.23, 0.25)) c = "W";
        if (stage >= 5 && ellipse(x, y, eyeX + 0.21, 9.78, 0.12, 0.14)) c = "H";
      }
      if (stage >= 4 && ellipse(x, y, eyeX + (eyeX < 10 ? -1.2 : 1.2), 11, 0.7, 0.3)) c = "P";
    }
    if (polygon(x, y, [[9.35, 10.6], [11.65, 10.6], [11.35, 11.35], [10.5, 11.8], [9.65, 11.35]])) c = "D";
    if (stage >= 4 && ellipse(x, y, 10.15, 10.87, 0.42, 0.15)) c = "X";
    if (line(x, y, [10.5, 11.7], [10.5, 12.35], 0.15) || line(x, y, [10.5, 12.35], [9.7, 12.65], 0.14) || line(x, y, [10.5, 12.35], [11.3, 12.65], 0.14)) c = "X";
    if (happy && ellipse(x, y, 10.5, 13, 0.5, 0.6)) c = "P";
    if (stage >= 5 && c === "O" && y < 8 && y > 5 && (Math.abs(x - 9.25) < 0.13 || Math.abs(x - 11.75) < 0.13)) c = "L";
    if (stage >= 5 && c === "C" && ((Math.abs(x - 5.6) < 0.13 && y > 12 && y < 12.7) || (Math.abs(x - 15.4) < 0.13 && y > 12 && y < 12.7))) c = "M";
  }
  return c;
}
function tailPixel(x: number, y: number, stage: number) {
  if (!ellipse(x, y, 17.3, 18.35, 3.05, 3.4)) return ".";
  if (!ellipse(x, y, 17.2, 18.2, 2.5, 2.85)) return "X";
  if (ellipse(x, y, 17.35, 17.65, 1.15, 1.3)) return ".";
  if (ellipse(x, y, 17.3, 17.9, 1.6, 1.85)) return stage >= 3 ? "C" : "O";
  return stage >= 3 && x > 18.8 ? "S" : stage >= 4 && y < 16.5 ? "L" : "O";
}

function paths(resolution: number, sample: (x: number, y: number) => string): PixelPath[] {
  const byColor = new Map<string, string[]>();
  for (let y = 0; y < resolution; y++) {
    let x = 0;
    while (x < resolution) {
      const start = x, color = sample(x++, y);
      while (x < resolution && sample(x, y) === color) x++;
      if (palette[color]) {
        const runs = byColor.get(color) ?? [];
        runs.push(`M${start} ${y}h${x - start}v1h-${x - start}z`);
        byColor.set(color, runs);
      }
    }
  }
  // One path per palette color keeps the native SVG tree small, even at 96px.
  return [...byColor].map(([color, runs]) => ({ color: palette[color], d: runs.join("") }));
}
const cache = new Map<string, DogSprite>();
export function getDogSprite(stage: number, happy = false): DogSprite {
  const index = Number.isFinite(stage) ? Math.max(0, Math.min(4, Math.floor(stage) - 1)) : 0;
  const key = `${index}:${happy}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const { resolution } = PET_APPEARANCES[index];
  const originalPixel = (x: number, y: number, tail: boolean) => {
    const row = y - 2;
    if (tail !== (row >= 13 && x >= 15)) return ".";
    if (happy && row === 7 && ((x >= 5 && x < 7) || (x >= 13 && x < 15))) return "X";
    return original[row]?.[x] ?? ".";
  };
  const sprite = {
    resolution,
    body: paths(resolution, (x, y) => index === 0 ? originalPixel(x, y, false) : bodyPixel((x + 0.5) * 24 / resolution, (y + 0.5) * 24 / resolution, index + 1, happy)),
    tail: paths(resolution, (x, y) => index === 0 ? originalPixel(x, y, true) : tailPixel((x + 0.5) * 24 / resolution, (y + 0.5) * 24 / resolution, index + 1)),
  };
  cache.set(key, sprite);
  return sprite;
}
