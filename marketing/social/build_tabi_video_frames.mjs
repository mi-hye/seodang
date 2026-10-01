import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/kangmihye/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const characterId = "u065c5";
const outputDir = "/tmp/seodang-tabi-carousel-frames";
const captureFps = 12;
const outputFps = 24;
const cycleSeconds = 3;
const cycles = 3;

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:8090/practice/${characterId}`, { waitUntil: "networkidle" });

const frames = [];
for (let cycle = 0; cycle < cycles; cycle += 1) {
  await page.getByText("획 보기", { exact: true }).click();
  const startedAt = Date.now();
  for (let index = 0; index < captureFps * cycleSeconds; index += 1) {
    frames.push(await page.screenshot());
    const nextFrameAt = startedAt + ((index + 1) * 1000) / captureFps;
    await page.waitForTimeout(Math.max(0, nextFrameAt - Date.now()));
  }
  await page.getByText("획 숨기기", { exact: true }).click();
}
await browser.close();

let outputIndex = 0;
for (const frame of frames) {
  const filename = path.join(outputDir, `frame-${String(outputIndex).padStart(4, "0")}.png`);
  await fs.writeFile(filename, frame);
  await fs.writeFile(path.join(outputDir, `frame-${String(outputIndex + 1).padStart(4, "0")}.png`), frame);
  outputIndex += 2;
}

console.log(JSON.stringify({ characterId, outputDir, frames: outputIndex, outputFps }));
