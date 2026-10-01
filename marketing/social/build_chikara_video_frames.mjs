import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "/Users/kangmihye/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
);

const characterId = "u0529b";
const outputDir = "/tmp/seodang-chikara-carousel-frames";
const captureFps = 12;
const outputFps = 24;
const animationSeconds = 7;

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 1,
});

await page.goto(`http://127.0.0.1:8090/practice/${characterId}`, {
  waitUntil: "networkidle",
});
const idleFrame = await page.screenshot();
await page.getByText("획 보기", { exact: true }).click();

const appFrames = [];
const startedAt = Date.now();
for (let index = 0; index < captureFps * animationSeconds; index += 1) {
  appFrames.push(await page.screenshot());
  const nextFrameAt = startedAt + ((index + 1) * 1000) / captureFps;
  await page.waitForTimeout(Math.max(0, nextFrameAt - Date.now()));
}
await browser.close();

async function writeFrame(index, buffer) {
  await fs.writeFile(
    path.join(outputDir, `frame-${String(index).padStart(4, "0")}.png`),
    buffer,
  );
}

let outputIndex = 0;
for (let index = 0; index < outputFps; index += 1) {
  await writeFrame(outputIndex++, idleFrame);
}
for (const frame of appFrames) {
  await writeFrame(outputIndex++, frame);
  await writeFrame(outputIndex++, frame);
}

console.log(JSON.stringify({
  characterId,
  outputDir,
  frames: outputIndex,
  outputFps,
}));
