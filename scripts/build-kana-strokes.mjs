#!/usr/bin/env node

// Reproducible adaptation of AnimCJK kana medians, licensed LGPL-3.0-or-later.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { KANA_LESSONS } from "../src/data/kanaCatalog.ts";

const revision = "ec5e17cca76c87587790bcbce5ea0b4d4fb753d6";
const root = new URL("../", import.meta.url);
const baseUrl = `https://raw.githubusercontent.com/parsimonhi/animCJK/${revision}`;

async function fetchText(relativePath) {
  const response = await fetch(`${baseUrl}/${relativePath}`);
  if (!response.ok) throw new Error(`${relativePath}: HTTP ${response.status}`);
  return response.text();
}

function direction(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) >= Math.abs(dy) * 1.4) return dx >= 0 ? "left_to_right" : "right_to_left";
  if (Math.abs(dy) >= Math.abs(dx) * 1.4) return dy >= 0 ? "top_to_bottom" : "bottom_to_top";
  if (dx >= 0 && dy >= 0) return "diagonal_down_right";
  if (dx < 0 && dy >= 0) return "diagonal_down_left";
  return dx >= 0 ? "diagonal_up_right" : "diagonal_up_left";
}

const round = (value) => Number(value.toFixed(3));
const clamp = (value) => round(Math.max(0, Math.min(100, value)));

function buildGuidePath(points) {
  let path = `M${points[0].x} ${points[0].y}`;
  let pathLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    if (points.length === 2) {
      path += ` L${end.x} ${end.y}`;
      pathLength += Math.hypot(end.x - start.x, end.y - start.y);
      continue;
    }
    // Catmull–Rom interpolation rounds the median into a handwriting guide,
    // retaining the source's stroke order, points, and pen start/end positions.
    const previous = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 2)];
    const control1 = { x: clamp(start.x + (end.x - previous.x) / 6), y: clamp(start.y + (end.y - previous.y) / 6) };
    const control2 = { x: clamp(end.x - (next.x - start.x) / 6), y: clamp(end.y - (next.y - start.y) / 6) };
    path += ` C${control1.x} ${control1.y} ${control2.x} ${control2.y} ${end.x} ${end.y}`;
    let last = start;
    for (let sample = 1; sample <= 24; sample++) {
      const t = sample / 24;
      const u = 1 - t;
      const point = {
        x: u ** 3 * start.x + 3 * u ** 2 * t * control1.x + 3 * u * t ** 2 * control2.x + t ** 3 * end.x,
        y: u ** 3 * start.y + 3 * u ** 2 * t * control1.y + 3 * u * t ** 2 * control2.y + t ** 3 * end.y,
      };
      pathLength += Math.hypot(point.x - last.x, point.y - last.y);
      last = point;
    }
  }
  return { path, pathLength: round(pathLength) };
}

function parseMedian(rawPath, literal) {
  const tokens = rawPath.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  const points = [];
  let command = "M";
  for (let i = 0; i < tokens.length;) {
    if (/^[A-Za-z]$/.test(tokens[i])) command = tokens[i++];
    const last = points.at(-1);
    if (command === "M" || command === "L") {
      points.push({ x: Number(tokens[i++]), y: Number(tokens[i++]) });
    } else if (command === "H" && last) {
      points.push({ x: Number(tokens[i++]), y: last.y });
    } else if (command === "V" && last) {
      points.push({ x: last.x, y: Number(tokens[i++]) });
    } else {
      throw new Error(`Unsupported median command ${command}: ${literal}`);
    }
  }
  if (points.length < 2 || points.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) {
    throw new Error(`Invalid median: ${literal}`);
  }
  return points;
}

function parseSvg(svg, literal) {
  const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  if (!viewBox) throw new Error(`Missing viewBox: ${literal}`);
  const width = Number(viewBox[1]);
  const height = Number(viewBox[2]);
  const strokesByOrder = new Map();
  for (const match of svg.matchAll(/<path\b[^>]*clip-path="url\(#[^"]+\)"[^>]*>/g)) {
    const tag = match[0];
    const order = Number(/--d:(\d+(?:\.\d+)?)s/.exec(tag)?.[1]);
    // A split outline can have two clip paths for ONE pen stroke (e.g. あ).
    // Their animation delay identifies the stroke; use its first complete median.
    if (strokesByOrder.has(order)) continue;
    const rawPath = /\sd="([^"]+)"/.exec(tag)?.[1];
    if (!order || !rawPath) {
      throw new Error(`Unsupported median: ${literal}: ${rawPath}`);
    }
    const points = parseMedian(rawPath, literal).map(({ x, y }) => ({
      x: round(x / width * 100), y: round(y / height * 100),
    }));
    if (points.some(({ x, y }) => x < 0 || x > 100 || y < 0 || y > 100)) {
      throw new Error(`Out-of-bounds median: ${literal}`);
    }
    const start = points[0];
    const end = points.at(-1);
    const { path, pathLength } = buildGuidePath(points);
    const strokeDirection = direction(start, end);
    let type = "curve";
    if (points.length === 2) {
      type = pathLength < 12 ? "dot"
        : strokeDirection.endsWith("to_right") || strokeDirection.endsWith("to_left") ? "horizontal"
        : strokeDirection === "top_to_bottom" || strokeDirection === "bottom_to_top" ? "vertical"
        : strokeDirection.includes("left") ? "sweep_left" : "sweep_right";
    }
    strokesByOrder.set(order, { order, path, pathLength, start, end, direction: strokeDirection, type });
  }
  const strokes = [...strokesByOrder.values()].sort((a, b) => a.order - b.order);
  if (!strokes.length || strokes.some((stroke, i) => stroke.order !== i + 1)) {
    throw new Error(`Invalid stroke order: ${literal}`);
  }
  return strokes;
}

const lessonLiterals = KANA_LESSONS.flatMap((lesson) => lesson.literals);
const literals = [...new Set(lessonLiterals.flatMap((literal) => [...literal]))];
const entries = [];
for (let i = 0; i < literals.length; i += 8) {
  entries.push(...await Promise.all(literals.slice(i, i + 8).map(async (literal) => [
    literal, parseSvg(await fetchText(`svgsJaKana/${literal.codePointAt(0)}.svg`), literal),
  ])));
}
const header = `// Generated by scripts/build-kana-strokes.mjs. Do not edit by hand.\n// AnimCJK ${revision}, Copyright 2016-2026 FM-SH. LGPL-3.0-or-later.\n// Adaptation: deduplicated pen strokes, smoothed medians, coordinates scaled to 0–100.\n`;
await writeFile(new URL("src/data/kanaStrokes.ts", root), `${header}import type { KanjiVgStroke } from "../types/practice";\n\nexport const kanaStrokes: Record<string, Array<Omit<KanjiVgStroke, "id">>> = ${JSON.stringify(Object.fromEntries(entries), null, 2)};\n`);
const counts = Object.fromEntries(entries.map(([literal, strokes]) => [literal, strokes.length]));
await writeFile(new URL("src/data/kanaStrokeCounts.ts", root), `${header}\nexport const kanaStrokeCounts: Record<string, number> = ${JSON.stringify(Object.fromEntries(lessonLiterals.map((literal) => [literal, [...literal].reduce((sum, part) => sum + counts[part], 0)])), null, 2)};\n`);
await mkdir(new URL("licenses/animcjk/", root), { recursive: true });
for (const file of ["COPYING.txt", "LGPL.txt"]) {
  await writeFile(new URL(`licenses/animcjk/${file}`, root), await fetchText(`licenses/${file}`));
}
const gplResponse = await fetch("https://raw.githubusercontent.com/gcc-mirror/gcc/master/COPYING3");
if (!gplResponse.ok) throw new Error(`GPL license: HTTP ${gplResponse.status}`);
await writeFile(new URL("licenses/animcjk/GPL.txt", root), await gplResponse.text());
console.log(`Generated ${entries.length} kana templates from AnimCJK ${revision} in ${fileURLToPath(root)}`);
