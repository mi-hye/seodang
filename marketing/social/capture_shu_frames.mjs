import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/kangmihye/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const outDir = process.argv[2] || '/tmp/seodang-shu-frames';
const characterId = process.argv[3] || 'u07fd2';
const captureFps = 12;
const outputFps = 24;
const holdSeconds = 1;
const animationSeconds = Number(process.argv[4] || 60);

await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const page = await browser.newPage({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:8090/practice/${characterId}`, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(outDir, 'preview.png') });

let frame = 0;
for (; frame < captureFps * holdSeconds; frame += 1) {
  await page.screenshot({
    path: path.join(outDir, `frame-${String(frame).padStart(4, '0')}.png`),
  });
}

await page.getByText('획 보기', { exact: true }).click();

const animationFrames = captureFps * animationSeconds;
const startedAt = Date.now();
for (let animationFrame = 0; animationFrame < animationFrames; animationFrame += 1, frame += 1) {
  await page.screenshot({
    path: path.join(outDir, `frame-${String(frame).padStart(4, '0')}.png`),
  });
  const nextFrameAt = startedAt + ((animationFrame + 1) * 1000) / captureFps;
  await page.waitForTimeout(Math.max(0, nextFrameAt - Date.now()));
}

await browser.close();
console.log(JSON.stringify({ outDir, characterId, captureFps, outputFps, frames: frame }));
