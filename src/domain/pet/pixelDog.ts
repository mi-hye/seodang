import { PET_APPEARANCES } from "./petAppearance.ts";

type Point = readonly [number, number];
type PixelPath = { color: string; d: string };
export type DogSprite = { resolution: number; body: PixelPath[]; tail: PixelPath[] };

const palette: Record<string, string> = {
  X: "#644B3E", O: "#D99D5E", P: "#E8A89C", C: "#FFF3D9",
  S: "#BA7C49", L: "#EDB979", H: "#FFE0A5", D: "#382E2B",
  W: "#FFFCF0", M: "#E9D4B0", R: "#CD897C",
  F: "#C85D50", V: "#8F3F3A", U: "#E58B70",
  B: "#6F9C91", J: "#3F655A", A: "#9BC2AC",
  N: "#4B4941",
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

function polygon(x: number, y: number, points: readonly Point[]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}
const leftEar: Point[] = [[3.5, 8], [3.7, 3.3], [4.4, 3.1], [8, 6]];
const rightEar: Point[] = [[13, 6], [16.6, 3.1], [17.3, 3.3], [17.5, 8]];
const leftInner: Point[] = [[4.4, 7], [4.5, 4.3], [6.9, 6.1]];
const rightInner: Point[] = [[14.1, 6.1], [16.5, 4.3], [16.6, 7]];
// Flat crown, bevelled cheeks and a compact sitting body keep the silhouette
// recognisably pixel-art at higher resolutions instead of becoming circles.
const head: Point[] = [[5.6, 5.5], [8, 4.9], [9.5, 4.9], [9.5, 4.6], [11.5, 4.6], [11.5, 4.9], [13, 4.9], [15.4, 5.5], [17.7, 7.3], [17.7, 11.8], [16.5, 13.4], [14.7, 14.6], [6.3, 14.6], [4.5, 13.4], [3.3, 11.8], [3.3, 7.3]];
const face: Point[] = [[5.9, 6], [8.1, 5.5], [12.9, 5.5], [15.1, 6], [17.1, 7.6], [17.1, 11.6], [16.1, 12.9], [14.5, 14], [6.5, 14], [4.9, 12.9], [3.9, 11.6], [3.9, 7.6]];
const muzzle: Point[] = [[3.9, 10.7], [5, 10], [6.1, 10.6], [9, 11.2], [12, 11.2], [14.9, 10.6], [16, 10], [17.1, 10.7], [17.1, 11.6], [16.1, 12.9], [14.5, 14], [6.5, 14], [4.9, 12.9], [3.9, 11.6]];
const body: Point[] = [[7.2, 14], [13.8, 14], [15.1, 17.2], [15.1, 21.2], [13.8, 22], [7.2, 22], [5.9, 21.2], [5.9, 17.2]];
const bodyFill: Point[] = [[7.7, 14.5], [13.3, 14.5], [14.5, 17.4], [14.5, 20.8], [13.5, 21.4], [7.5, 21.4], [6.5, 20.8], [6.5, 17.4]];
const bib: Point[] = [[8, 14.5], [13, 14.5], [12.8, 17.2], [12.2, 17.8], [12.2, 19.3], [10.5, 20.1], [8.8, 19.3], [8.8, 17.8], [8.2, 17.2]];
// A chunky upturned tail, without a fine spiral competing with the face.
// Its grid stays coarse even when the face gains detail at later milestones.
const tailRows = [
  "..XXXX.",
  ".XCCCX.",
  ".XCCCOX",
  "..XOOOX",
  "XXOOOOX",
  "XOOOOX.",
  "XXXXX..",
];

// Lv.10 gets a hand-placed 32px face: compact eyes, a Shiba nose and no
// hollow ring-shaped mouth. Sampling the later stages loses these details.
function levelTenFace(x: number, y: number, base: string, happy: boolean) {
  const col = Math.floor(x * 4 / 3), row = Math.floor(y * 4 / 3);
  for (const eye of [10, 16]) {
    if (row === 10 && col >= eye && col <= eye + 1) return "C";
    if (happy) {
      if ((row === 12 && col === eye) || (row === 13 && (col === eye - 1 || col === eye + 1))) return "D";
    } else if (col >= eye && col <= eye + 1 && row >= 12 && row <= 13) {
      return row === 12 && col === eye ? "W" : "D";
    }
  }
  if (row === 15 && (col === 8 || col === 9 || col === 18 || col === 19)) return "P";
  if ((row === 15 && col >= 12 && col <= 15) || (row === 16 && col >= 13 && col <= 14)) return "D";
  if (happy && row === 17 && col >= 13 && col <= 14) return "P";
  return base;
}

// Lv.20 refines the accepted Lv.10 proportions on its own 48px grid.
// Keep the close-set eyes and solid nose; extra pixels refine edges, not a new expression.
function levelTwentyFace(x: number, y: number, base: string, happy: boolean) {
  const col = Math.floor(x * 2), row = Math.floor(y * 2);
  for (const eye of [15, 24]) {
    if (row >= 15 && row <= 16 && col >= eye && col <= eye + 2) return "C";
    if (happy) {
      if ((row === 18 && col === eye + 1) ||
          (row === 19 && (col === eye || col === eye + 2)) ||
          (row === 20 && (col === eye - 1 || col === eye + 3))) return "D";
    } else if (col >= eye && col <= eye + 2 && row >= 18 && row <= 20) {
      if (row === 18 && col === eye) return "W";
      return row === 20 && col === eye + 2 ? "X" : "D";
    }
  }
  if (row === 23 && ((col >= 12 && col <= 14) || (col >= 27 && col <= 29))) return "P";
  if ((row === 23 && col >= 18 && col <= 23) ||
      (row === 24 && col >= 19 && col <= 22) ||
      (row === 25 && col >= 20 && col <= 21)) return "D";
  if (happy && row === 26 && col >= 20 && col <= 21) return "P";
  return base;
}

// Lv.30 keeps Lv.20's expression, with hand-placed 64px highlights and edges.
function levelThirtyFace(x: number, y: number, base: string, happy: boolean) {
  const col = Math.floor(x * 8 / 3), row = Math.floor(y * 8 / 3);
  for (const eye of [20, 32]) {
    if (row >= 20 && row <= 22 && col >= eye && col <= eye + 3) return "C";
    if (happy) {
      if ((row === 24 && (col === eye + 1 || col === eye + 2)) ||
          (row === 25 && (col === eye || col === eye + 3)) ||
          ((row === 26 || row === 27) && (col === eye - 1 || col === eye + 4))) return "D";
    } else if (col >= eye && col <= eye + 3 && row >= 24 && row <= 27) {
      if (row === 24 && col <= eye + 1) return "W";
      if ((row === 27 && col >= eye + 2) || (row === 26 && col === eye + 3)) return "X";
      return "D";
    }
  }
  if ((row === 31 || row === 32) && ((col >= 16 && col <= 19) || (col >= 36 && col <= 39))) return row === 31 ? "P" : "R";
  if ((row === 31 && col >= 24 && col <= 31) ||
      (row === 32 && col >= 25 && col <= 30) ||
      (row === 33 && col >= 26 && col <= 29) ||
      (row === 34 && col >= 27 && col <= 28)) return "D";
  if (happy && (row === 35 || row === 36) && col >= 27 && col <= 28) return "P";
  return base;
}

// The final 96px face follows Lv.30, refining glints and the solid nose contour.
function levelFortyFace(x: number, y: number, base: string, happy: boolean) {
  const col = Math.floor(x * 4), row = Math.floor(y * 4);
  for (const eye of [30, 48]) {
    if (row >= 30 && row <= 34 && col >= eye && col <= eye + 5) return "C";
    if (happy) {
      if ((row === 36 && (col === eye + 2 || col === eye + 3)) ||
          (row === 37 && (col === eye + 1 || col === eye + 4)) ||
          (row === 38 && ((col >= eye && col <= eye + 1) || (col >= eye + 4 && col <= eye + 5))) ||
          (row === 39 && ((col >= eye - 1 && col <= eye) || (col >= eye + 5 && col <= eye + 6))) ||
          ((row === 40 || row === 41) && ((col >= eye - 2 && col <= eye - 1) || (col >= eye + 6 && col <= eye + 7)))) return "D";
    } else if (col >= eye && col <= eye + 5 && row >= 36 && row <= 41) {
      if ((row === 36 && col <= eye + 2) || (row === 37 && col <= eye + 1)) return "W";
      if ((row >= 40 && col >= eye + 3) || (row === 39 && col === eye + 5)) return "X";
      return "D";
    }
  }
  if (row >= 47 && row <= 49 && ((col >= 24 && col <= 29) || (col >= 54 && col <= 59))) return row === 49 ? "R" : "P";
  if (row >= 47 && row <= 52 && col >= 36 + row - 47 && col <= 47 - (row - 47)) return "D";
  if (happy && (((row === 53 || row === 54) && col >= 40 && col <= 43) ||
      (row === 55 && col >= 41 && col <= 42))) return "P";
  return base;
}

// Draw onto a genuinely denser integer grid at each milestone, not an enlarged
// low-resolution bitmap. Fine highlights, fur and paws use sub-24px features.
function bodyPixel(x: number, y: number, stage: number, happy: boolean) {
  let c = ".";
  if (polygon(x, y, body)) {
    c = polygon(x, y, bodyFill) ? "O" : "X";
    if (stage >= 3 && x > 13 && c === "O") c = "S";
    if (polygon(x, y, bib)) c = stage >= 3 && x > 11.8 ? "M" : "C";
    if (stage >= 4 && y > 18.2 && y < 20.7 && (Math.abs(x - 8) < 0.13 || Math.abs(x - 13) < 0.13)) c = "S";
  }
  for (const footX of [7.4, 13.6]) {
    if (Math.abs(x - footX) < 1.45 && y > 21.1 && y < 22.5) c = "X";
    if (Math.abs(x - footX) < 0.95 && y > 21.1 && y < 21.95) c = "C";
    if (stage >= 4 && y > 21.7 && y < 22.1 && (Math.abs(x - footX + 0.45) < 0.12 || Math.abs(x - footX - 0.45) < 0.12)) c = "M";
  }
  if (polygon(x, y, leftEar) || polygon(x, y, rightEar)) c = "X";
  if (polygon(x, y, leftInner) || polygon(x, y, rightInner)) c = "P";
  if (stage >= 4 && ((polygon(x, y, leftInner) && x < 4.8) || (polygon(x, y, rightInner) && x > 16.2))) c = "R";
  // The continuous polygon misses this row at 32px, merging chin and bib.
  if (stage === 2 && Math.floor(y * 4 / 3) === 19 && x >= 6 && x < 15) return "X";
  if (stage === 3 && Math.floor(y * 2) === 29 && x >= 6 && x < 15) return "X";
  if (stage === 4 && Math.floor(y * 8 / 3) === 39 && x >= 6 && x < 15) return "X";
  if (stage === 5 && Math.floor(y * 4) >= 58 && Math.floor(y * 4) <= 59 && x >= 6 && x < 15) return "X";
  if (polygon(x, y, head)) {
    c = "X";
    if (polygon(x, y, face)) {
      c = "O";
      if (stage >= 3 && x > 14.5) c = "S";
      if (stage >= 3 && y < 6.3 && x < 12.5) c = "L";
      if (polygon(x, y, muzzle)) c = stage >= 3 && y > 13.5 ? "M" : "C";
    }
    if (stage === 2) return levelTenFace(x, y, c, happy);
    if (stage === 3) return levelTwentyFace(x, y, c, happy);
    if (stage === 4) return levelThirtyFace(x, y, c, happy);
    if (stage === 5) return levelFortyFace(x, y, c, happy);
  }
  return c;
}
function tailPixel(x: number, y: number) {
  return tailRows[Math.floor(y) - 15]?.[Math.floor(x) - 14] ?? ".";
}

const scarf: Point[] = [[6.7, 15], [14.4, 15], [13.4, 16.7], [10.5, 18.2], [7.6, 16.7]];
const scarfFill: Point[] = [[7.5, 15.3], [13.6, 15.3], [12.9, 16.2], [10.5, 17.5], [8.1, 16.2]];
const scarfKnot: Point[] = [[13.4, 15.1], [15, 15.1], [15.8, 16.3], [14.3, 16], [14.9, 17.6], [13.5, 16.7]];
const scholarHat: Point[] = [[7, 4.9], [7, 1.8], [8.4, 1.2], [10.5, 2], [12.6, 1.2], [14, 1.8], [14, 4.9]];
const scholarHatFill: Point[] = [[7.6, 4.4], [7.6, 2.2], [8.5, 1.9], [10.5, 2.7], [12.5, 1.9], [13.4, 2.2], [13.4, 4.4]];
const scrollRoll: Point[] = [[3.6, 16.8], [6.9, 16.8], [7.4, 17.3], [6.9, 17.8], [3.6, 17.8], [3.1, 17.3]];

// Milestones must read at thumbnail size, not only at their native pixel count.
// Accessories share the cached body layer; the simple animated tail is unchanged.
function milestonePixel(x: number, y: number, stage: number, happy: boolean) {
  const grown = stage >= 4 && y >= 15;
  const bodyX = grown ? 10.5 + (x - 10.5) / 1.14 : x;
  const bodyY = grown ? 15 + (y - 15) / 1.07 : y;
  let c = bodyPixel(bodyX, bodyY, stage, happy);

  if (stage === 3 || stage === 4) {
    if (polygon(x, y, scarfKnot)) c = "V";
    if (polygon(x, y, scarf)) c = polygon(x, y, scarfFill) ? "F" : "V";
    if (c === "F" && y < 15.9) c = "U";
  }
  if (stage === 4) {
    // A teal carrying cord connects the parchment scroll to the shoulder.
    if (y >= 16 && y <= 20 && Math.abs(x - (14 - (y - 16) * 1.85)) < 0.35 && c !== ".") c = "J";
    if (x >= 3.6 && x < 7.1 && y >= 17.1 && y < 21.8) {
      c = "X";
      if (x >= 4.1 && x < 6.6 && y >= 17.6 && y < 21.3) c = x > 6 ? "M" : "C";
      if (y < 17.8 || y >= 21) c = "S";
      if (y >= 19 && y < 19.7) c = "F";
    }
    if (x >= 3.9 && x < 6.8 && ((y >= 16.8 && y < 17.3) || (y >= 21.6 && y < 22.1))) c = "X";
    if (polygon(x, y, scrollRoll)) c = y >= 17.1 && y < 17.5 && x >= 3.8 && x < 6.7 ? "M" : "X";
  }
  if (stage === 5) {
    // A shorter jade neckerchief leaves the dog's chest and paws uncovered.
    const scarfY = 15 + (y - 15) / 0.7;
    if (polygon(x, scarfY, scarfKnot)) c = "J";
    if (polygon(x, scarfY, scarf)) c = polygon(x, scarfY, scarfFill) ? "B" : "J";
    if (c === "B" && scarfY < 15.9) c = "A";
    if (polygon(x, y, scholarHat)) c = polygon(x, y, scholarHatFill) ? "N" : "D";
    if (y >= 4.4 && y < 5.5 && x >= 6.5 && x < 14.5) c = "D";
    if (y >= 4.7 && y < 5 && x >= 7 && x < 14) c = "N";
  }
  return c;
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
    body: paths(resolution, (x, y) => index === 0 ? originalPixel(x, y, false) : milestonePixel((x + 0.5) * 24 / resolution, (y + 0.5) * 24 / resolution, index + 1, happy)),
    tail: paths(resolution, (x, y) => index === 0 ? originalPixel(x, y, true) : tailPixel((x + 0.5) * 24 / resolution, (y + 0.5) * 24 / resolution)),
  };
  cache.set(key, sprite);
  return sprite;
}
