#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_INPUT = path.resolve(
  process.cwd(),
  "data/generated/animcjk-covered-reviewonly.generated.json"
);
const DEFAULT_SVG_DIR = "/tmp/animCJK-compare/svgsJa";
const DEFAULT_OUTPUT = path.resolve(
  process.cwd(),
  "data/generated/animcjk-import.generated.json"
);

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const coveredInput = JSON.parse(await fs.readFile(options.input, "utf8"));
  const coveredRows = coveredInput.covered ?? [];
  const characters = [];
  const strokes = [];

  for (const row of coveredRows) {
    const svgPath = path.join(options.svgDir, `${row.literal.codePointAt(0)}.svg`);
    const svg = await fs.readFile(svgPath, "utf8");
    const parsed = parseAnimCjkSvg(svg, row);

    characters.push(parsed.character);
    strokes.push(...parsed.strokes);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "AnimCJK svgsJa",
    license: "Arphic Public License",
    input: options.input,
    svgDir: options.svgDir,
    totals: {
      characters: characters.length,
      strokes: strokes.length,
    },
    characters,
    strokes,
  };

  await fs.mkdir(path.dirname(options.output), { recursive: true });
  await fs.writeFile(options.output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  process.stdout.write(`${options.output}\n`);
}

function parseArgs(args) {
  const options = {
    input: DEFAULT_INPUT,
    svgDir: DEFAULT_SVG_DIR,
    output: DEFAULT_OUTPUT,
  };

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (value === "--input") {
      options.input = path.resolve(process.cwd(), args[index + 1] ?? DEFAULT_INPUT);
      index += 1;
      continue;
    }

    if (value === "--svg-dir") {
      options.svgDir = args[index + 1] ?? DEFAULT_SVG_DIR;
      index += 1;
      continue;
    }

    if (value === "--output") {
      options.output = path.resolve(process.cwd(), args[index + 1] ?? DEFAULT_OUTPUT);
      index += 1;
    }
  }

  return options;
}

function parseAnimCjkSvg(svg, row) {
  const viewBoxMatch = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!viewBoxMatch) {
    throw new Error(`Missing viewBox for ${row.literal}`);
  }

  const [, widthRaw, heightRaw] = viewBoxMatch;
  const viewBoxWidth = Number(widthRaw);
  const viewBoxHeight = Number(heightRaw);
  const maskPathByClipId = new Map();

  const maskPathMatches = [...svg.matchAll(/<path id="z\d+d(\d+)" d="([^"]+)"/g)];
  for (const match of maskPathMatches) {
    maskPathByClipId.set(`z${row.literal.codePointAt(0)}c${match[1]}`, match[2]);
  }

  const medianMatches = [...svg.matchAll(/<path[^>]*clip-path="url\(#([^"]+)\)"[^>]*d="([^"]+)"/g)];
  const strokeRows = medianMatches.map((match, index) => {
    const clipId = match[1];
    const medianPath = match[2];
    const maskPath = maskPathByClipId.get(clipId);

    if (!maskPath) {
      throw new Error(`Missing mask path for ${row.literal} clip ${clipId}`);
    }

    const points = toPairs(parseNumbers(medianPath));
    const start = points[0];
    const end = points[points.length - 1];
    const direction = classifyDirection(start, end);
    const strokeType = inferStrokeType(points, direction);
    const order = index + 1;

    return {
      id: `${row.id}-s${String(order).padStart(2, "0")}`,
      character_id: row.id,
      stroke_order: order,
      stroke_type: strokeType,
      raw_type: "animcjk_median",
      direction,
      path: maskPath,
      start_x: Math.round(start.x),
      start_y: Math.round(start.y),
      end_x: Math.round(end.x),
      end_y: Math.round(end.y),
      note: medianPath,
    };
  });

  return {
    character: {
      id: row.id,
      literal: row.literal,
      source: "AnimCJK",
      license: "Arphic Public License",
      view_box_width: viewBoxWidth,
      view_box_height: viewBoxHeight,
      stroke_count: strokeRows.length,
      meaning_ko: row.meaningKo,
      meaning_ja: row.meaningJa,
      sort_order: row.sortOrder,
      metadata: {
        strokeSource: "AnimCJK",
        strokeSvgFile: `${row.literal.codePointAt(0)}.svg`,
      },
    },
    strokes: strokeRows,
  };
}

function parseNumbers(pathValue) {
  return (pathValue.match(/-?\d*\.?\d+/g) ?? []).map(Number);
}

function toPairs(numbers) {
  const pairs = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    pairs.push({ x: numbers[index], y: numbers[index + 1] });
  }
  return pairs;
}

function classifyDirection(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx >= absDy * 1.4) {
    return dx >= 0 ? "left_to_right" : "right_to_left";
  }

  if (absDy >= absDx * 1.4) {
    return dy >= 0 ? "top_to_bottom" : "bottom_to_top";
  }

  if (dx >= 0 && dy >= 0) return "diagonal_down_right";
  if (dx < 0 && dy >= 0) return "diagonal_down_left";
  if (dx >= 0 && dy < 0) return "diagonal_up_right";
  return "diagonal_up_left";
}

function inferStrokeType(points, direction) {
  if (points.length <= 1) {
    return "dot";
  }

  if (points.length === 2) {
    if (direction === "left_to_right" || direction === "right_to_left") {
      return "horizontal";
    }
    if (direction === "top_to_bottom" || direction === "bottom_to_top") {
      return "vertical";
    }
    return direction.includes("left") ? "sweep_left" : "sweep_right";
  }

  const hasStrongTurn = points.slice(1, -1).some((point, index) => {
    const prev = points[index];
    const next = points[index + 2];
    if (!next) {
      return false;
    }
    const dx1 = point.x - prev.x;
    const dy1 = point.y - prev.y;
    const dx2 = next.x - point.x;
    const dy2 = next.y - point.y;
    return Math.sign(dx1) !== Math.sign(dx2) || Math.sign(dy1) !== Math.sign(dy2);
  });

  if (hasStrongTurn) {
    return "turn";
  }

  if (direction.includes("left")) {
    return "sweep_left";
  }

  if (direction.includes("right")) {
    return "sweep_right";
  }

  return "curve";
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
