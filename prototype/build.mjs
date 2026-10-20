import { cp, mkdir, rm, readdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
await readFile('assets/audio/catalog.json'); // Never ship a build without a published voice release.
await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const p of ["index.html", "playable.html", "setup.html", "analytics-privacy.html", "src", "assets"])
  await cp(p, `dist/${p}`, { recursive: true, filter: source => {
    if(!source.startsWith('assets/audio/'))return true;
    return ['assets/audio/catalog.json','assets/audio/NOTICE.txt','assets/audio/LICENSE-Supertonic-3.txt'].includes(source);
  } });
const developmentMode = process.env.SEODANG_DEV_MODE === '1';
await writeFile('dist/src/build-config.js', `export const developmentMode = ${developmentMode};\nexport const appVersion = ${JSON.stringify(JSON.parse(await readFile('app.json','utf8')).expo.version)};\n`);
await cp("start-asset-test.html", "dist/start-asset-test.html");
await mkdir("dist/references", { recursive: true });
for (const name of ["01_start_hanok.png"])
  await cp(`references/${name}`, `dist/references/${name}`);
const initial = [
  "app.js",
  "study-state.js",
  "video-lesson-state.js",
  "scenario-state.js",
  "expert-state.js",
  "expert-discussion-state.js",
  "analytics.js",
  "analytics-core.js",
  "analytics-acquisition.js",
  "analytics-learning.js",
  "practice-state.js",
  "i18n.js",
  "korean-state.js",
  "basics-state.js",
  "katakana-lessons.js",
  "learning-map.js",
  "dialogue-state.js",
  "reading-state.js",
  "build-config.js",
  "labels-state.js",
  "listening-state.js",
  "sheet.js",
  "sentence-state.js",
  "header.js",
  "content.js",
  "engine.js",
  "learning-history.js",
  "kana-state.js",
  "parcel-words.js",
  "storage.js",
  "media.js",
  "ui.js",
];
let js = 0,
  total = 0;
for (const file of await readdir("src")) {
  if (file.endsWith(".js")) {
    const bytes = gzipSync(await readFile(`dist/src/${file}`)).length;
    total += bytes;
    if (initial.includes(file)) js += bytes;
  }
}
console.log(
  JSON.stringify(
    {
      developmentMode,
      initialJS_gzip: js,
      totalJS_gzip: total,
      CSS_gzip: gzipSync(await readFile("src/style.css")).length,
      initialCSS_gzip: (await Promise.all(["style.css","header.css","learning-map.css","library.css"].map(async name=>gzipSync(await readFile(`src/${name}`)).length))).reduce((a,b)=>a+b,0),
      build: "dist",
      note: "Same mobile/desktop entry. Panels dynamically imported. New isolated prototype; no previous bundle baseline.",
    },
    null,
    2,
  ),
);
