import { cp, mkdir, rm, readdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// V8 parses the module graph without linking or evaluating browser code. The
// separate process enables Node's built-in ESM parser without changing build flags
// or adding a parser dependency; import() remains outside dependencySpecifiers.
export async function measureModuleGraph(entry, directory = '.') {
  const source = `
    import { readFile } from 'node:fs/promises';
    import { SourceTextModule } from 'node:vm';
    import { gzipSync } from 'node:zlib';
    import { resolve, relative, sep } from 'node:path';
    import { pathToFileURL, fileURLToPath } from 'node:url';
    const root = resolve(process.argv[1]), modules = new Map();
    async function visit(file) {
      const name = relative(root, file).split(sep).join('/');
      if (name.startsWith('../') || name === '..') throw Error('Module outside build: ' + name);
      if (modules.has(name)) return;
      const text = await readFile(file, 'utf8');
      const parsed = new SourceTextModule(text, { identifier: pathToFileURL(file).href });
      modules.set(name, gzipSync(text).length);
      for (const specifier of parsed.dependencySpecifiers) {
        if (!specifier.startsWith('.')) throw Error('Unsupported module specifier: ' + specifier);
        await visit(fileURLToPath(new URL(specifier, pathToFileURL(file))));
      }
    }
    await visit(resolve(root, process.argv[2]));
    console.log(JSON.stringify({ gzip: [...modules.values()].reduce((n, size) => n + size, 0), files: [...modules.keys()].sort() }));
  `;
  const { stdout } = await promisify(execFile)(process.execPath,
    ['--experimental-vm-modules', '--disable-warning=ExperimentalWarning', '--input-type=module', '-e', source, resolve(directory), entry]);
  return JSON.parse(stdout);
}

async function build() {
  await readFile('assets/audio/catalog.json'); // Never ship a build without a published voice release.
  await rm("dist", { recursive: true, force: true });
  await mkdir("dist");
  for (const p of ["index.html", "quiz.html", "playable.html", "setup.html", "analytics-privacy.html", "src", "assets"])
    await cp(p, `dist/${p}`, { recursive: true, filter: source => {
      if(!source.startsWith('assets/audio/'))return true;
      return ['assets/audio/catalog.json','assets/audio/NOTICE.txt','assets/audio/LICENSE-Supertonic-3.txt'].includes(source);
    } });
  const developmentMode = process.env.SEODANG_DEV_MODE === '1';
  await writeFile('dist/src/build-config.js', `export const developmentMode = ${developmentMode};\nexport const appVersion = ${JSON.stringify(JSON.parse(await readFile('app.json','utf8')).expo.version)};\n`);
  // Pending lyric permissions: local previews never enter production assets.
  if(!developmentMode){
    await writeFile('dist/src/song-lesson-content.js','export const songContent = {};\n');
    await writeFile('dist/src/course-twenty-song-content.js','export const courseTwentySongContent = {};\n');
  }
  await cp("start-asset-test.html", "dist/start-asset-test.html");
  await mkdir("dist/references", { recursive: true });
  for (const name of ["01_start_hanok.png"])
    await cp(`references/${name}`, `dist/references/${name}`);
  const initial = await measureModuleGraph('src/app.js', 'dist');
  let total = 0;
  for (const file of await readdir("dist/src", { recursive: true })) {
    if (file.endsWith(".js")) total += gzipSync(await readFile(`dist/src/${file}`)).length;
  }
  console.log(
    JSON.stringify(
      {
        developmentMode,
        initialJS_gzip: initial.gzip,
        initialJS_modules: initial.files,
        totalJS_gzip: total,
        CSS_gzip: gzipSync(await readFile("src/style.css")).length,
        initialCSS_gzip: (await Promise.all(["style.css","header.css","learning-map.css","library.css"].map(async name=>gzipSync(await readFile(`src/${name}`)).length))).reduce((a,b)=>a+b,0),
        build: "dist",
        note: "Same mobile/desktop app.js entry. Recursively parsed static imports/re-exports; dynamic imports excluded. Gzip summed per generated module.",
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await build();
