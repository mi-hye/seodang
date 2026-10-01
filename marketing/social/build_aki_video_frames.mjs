import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "/Users/kangmihye/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
);

const characterId = "u079cb";
const carouselDir = "/tmp/seodang-aki-carousel-frames";
const reelDir = "/tmp/seodang-aki-reel-frames";
const captureFps = 12;
const outputFps = 24;
const animationSeconds = 7;

for (const directory of [carouselDir, reelDir]) {
  await fs.rm(directory, { recursive: true, force: true });
  await fs.mkdir(directory, { recursive: true });
}

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });

await page.goto(`http://127.0.0.1:8090/practice/${characterId}`, { waitUntil: "networkidle" });
const idleFrame = await page.screenshot();
await page.getByText("획 보기", { exact: true }).click();

const appFrames = [];
const startedAt = Date.now();
for (let index = 0; index < captureFps * animationSeconds; index += 1) {
  appFrames.push(await page.screenshot());
  const nextFrameAt = startedAt + ((index + 1) * 1000) / captureFps;
  await page.waitForTimeout(Math.max(0, nextFrameAt - Date.now()));
}

await page.setContent(`<!doctype html><html><body style="margin:0;width:1080px;height:1920px;background:linear-gradient(150deg,#173c2e 0%,#234f3c 58%,#b66e3c 100%);display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif;color:#fff7e7"><main style="text-align:center"><div style="font-size:92px;font-weight:800;letter-spacing:-4px">秋, 어떻게 읽을까요?</div><div style="font-size:390px;font-weight:800;line-height:1.25">秋</div><div style="font-size:52px;color:#efd1b6">9획을 따라 쓰며 확인해보세요 ✍️</div></main></body></html>`);
const hookFrame = await page.screenshot();
await browser.close();

async function writeFrame(directory, index, buffer) {
  await fs.writeFile(path.join(directory, `frame-${String(index).padStart(4, "0")}.png`), buffer);
}

let carouselIndex = 0;
for (let index = 0; index < outputFps; index += 1) {
  await writeFrame(carouselDir, carouselIndex++, idleFrame);
}
for (const frame of appFrames) {
  await writeFrame(carouselDir, carouselIndex++, frame);
  await writeFrame(carouselDir, carouselIndex++, frame);
}

let reelIndex = 0;
for (let index = 0; index < Math.round(outputFps * 1.5); index += 1) {
  await writeFrame(reelDir, reelIndex++, hookFrame);
}
for (let repeat = 0; repeat < 2; repeat += 1) {
  for (const frame of appFrames) {
    await writeFrame(reelDir, reelIndex++, frame);
    await writeFrame(reelDir, reelIndex++, frame);
  }
}

console.log(JSON.stringify({
  characterId,
  carouselDir,
  reelDir,
  carouselFrames: carouselIndex,
  reelFrames: reelIndex,
  outputFps,
}));
