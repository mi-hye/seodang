import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const rootDir = process.cwd();
const defaultInputPath = path.join(rootDir, "data/generated/kanji-words.generated.json");
const defaultOutputPath = path.join(
  rootDir,
  "data/generated/kanji-words-ko.generated.json",
);
const defaultCachePath = path.join(
  rootDir,
  "data/generated/kanji-word-meaning-ko-cache.generated.json",
);
const defaultJmdictUrl = "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz";
const defaultJmdictCachePath = path.join("/tmp", "JMdict_e.gz");

const options = parseArgs(process.argv.slice(2));
const [rows, jmdictXml, translationCache] = await Promise.all([
  readJsonArray(options.inputPath),
  loadJmdictXml(options.jmdictPath, options.jmdictUrl),
  readOptionalJsonObject(options.cachePath),
]);

const glossByWordReading = buildGlossByWordReading(jmdictXml);
const glossesToTranslate = collectGlossesToTranslate({
  glossByWordReading,
  limit: options.limit,
  rows,
  translationCache,
});

await translateGlosses({
  cache: translationCache,
  cachePath: options.cachePath,
  concurrency: options.concurrency,
  glosses: glossesToTranslate,
});

const outputRows = [];
let missingGlossCount = 0;

for (const row of rows) {
  const words = [];

  for (const word of row.words ?? []) {
    const gloss = glossByWordReading.get(buildKey(word.word, word.reading));
    const meaningKo = gloss ? translationCache[gloss] ?? null : null;

    if (!gloss) {
      missingGlossCount += 1;
    }

    words.push({
      ...word,
      meaningKo,
    });
  }

  outputRows.push({
    ...row,
    words,
  });
}

await mkdir(path.dirname(options.outputPath), { recursive: true });
await writeJson(options.outputPath, outputRows);
await writeJson(options.cachePath, translationCache);

console.log(
  `Wrote ${outputRows.length} kanji rows to ${path.relative(rootDir, options.outputPath)}.`,
);
console.log(
  `Translated meanings: ${glossesToTranslate.length}; missing JMdict glosses: ${missingGlossCount}.`,
);

function collectGlossesToTranslate({ glossByWordReading, limit, rows, translationCache }) {
  const glosses = [];
  const seen = new Set();

  for (const row of rows) {
    for (const word of row.words ?? []) {
      const gloss = glossByWordReading.get(buildKey(word.word, word.reading));

      if (!gloss || translationCache[gloss] || seen.has(gloss)) {
        continue;
      }

      seen.add(gloss);
      glosses.push(gloss);

      if (limit != null && glosses.length >= limit) {
        return glosses;
      }
    }
  }

  return glosses;
}

async function translateGlosses({ cache, cachePath, concurrency, glosses }) {
  let index = 0;
  let completed = 0;

  async function worker() {
    while (index < glosses.length) {
      const gloss = glosses[index];
      index += 1;
      await translateGloss(gloss, cache);
      completed += 1;

      if (completed % 100 === 0 || completed === glosses.length) {
        await writeJson(cachePath, cache);
        console.log(`Translated ${completed}/${glosses.length} glosses.`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, () => worker()),
  );
}

function buildGlossByWordReading(xml) {
  const byKey = new Map();
  const entryPattern = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryPattern.exec(xml))) {
    const entryXml = match[1];
    const words = extractAll(entryXml, "keb").map(decodeXml);
    const readings = extractReadingElements(entryXml);

    if (words.length === 0 || readings.length === 0) {
      continue;
    }

    for (const word of words) {
      for (const readingElement of readings) {
        if (
          readingElement.restrictedTo.length > 0 &&
          !readingElement.restrictedTo.includes(word)
        ) {
          continue;
        }

        const gloss = selectGloss(entryXml, word, readingElement.reading);

        if (!gloss) {
          continue;
        }

        const key = buildKey(word, toHiragana(readingElement.reading));

        if (!byKey.has(key)) {
          byKey.set(key, gloss);
        }
      }
    }
  }

  return byKey;
}

function extractReadingElements(entryXml) {
  return [...entryXml.matchAll(/<r_ele>([\s\S]*?)<\/r_ele>/g)]
    .map((match) => {
      const xml = match[1];

      if (xml.includes("<re_nokanji")) {
        return null;
      }

      return {
        reading: decodeXml(extractFirst(xml, "reb")),
        restrictedTo: extractAll(xml, "re_restr").map(decodeXml),
      };
    })
    .filter(Boolean)
    .filter((row) => row.reading);
}

function selectGloss(entryXml, word, reading) {
  const fallbackGlosses = [];

  for (const senseMatch of entryXml.matchAll(/<sense>([\s\S]*?)<\/sense>/g)) {
    const senseXml = senseMatch[1];
    const restrictedWords = extractAll(senseXml, "stagk").map(decodeXml);
    const restrictedReadings = extractAll(senseXml, "stagr").map(decodeXml);
    const glosses = extractAll(senseXml, "gloss").map(decodeXml).filter(Boolean);

    if (glosses.length === 0) {
      continue;
    }

    if (
      restrictedWords.length > 0 &&
      !restrictedWords.includes(word)
    ) {
      continue;
    }

    if (
      restrictedReadings.length > 0 &&
      !restrictedReadings.includes(reading)
    ) {
      continue;
    }

    const compactGloss = compactGlosses(glosses);

    if (!compactGloss) {
      continue;
    }

    if (restrictedWords.length === 0 && restrictedReadings.length === 0) {
      return compactGloss;
    }

    fallbackGlosses.push(compactGloss);
  }

  return fallbackGlosses[0] ?? null;
}

function compactGlosses(glosses) {
  const cleaned = glosses
    .map(cleanGloss)
    .filter(Boolean)
    .slice(0, 2);

  return cleaned.length > 0 ? cleaned.join(", ") : null;
}

function cleanGloss(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*\([^)]*(?:esp\.|usu\.|abbr\.|arch\.|honorific|humble|polite|slang)[^)]*\)/gi, "")
    .replace(/^to\s+/i, "")
    .trim()
    .replace(/[.;:]$/u, "");
}

async function translateGloss(gloss, cache) {
  if (!gloss) {
    return null;
  }

  if (cache[gloss]) {
    return cache[gloss];
  }

  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "en");
  url.searchParams.set("tl", "ko");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", gloss);

  let response;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      break;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
    }
  }

  if (!response?.ok) {
    throw new Error(`Failed to translate "${gloss}": ${response.status}`);
  }

  const json = await response.json();
  const translated = normalizeKoreanMeaning(
    Array.isArray(json?.[0])
      ? json[0].map((part) => part?.[0] ?? "").join("")
      : "",
  );

  cache[gloss] = translated;
  return translated;
}

function normalizeKoreanMeaning(value) {
  const normalized = dedupeCommaParts(value)
    .replace(/\s+/g, " ")
    .replace(/[.。]$/u, "")
    .trim();

  return normalized || null;
}

function dedupeCommaParts(value) {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return value;
  }

  return [...new Set(parts)].join(", ");
}

async function loadJmdictXml(jmdictPath, jmdictUrl) {
  const buffer =
    jmdictPath && existsSync(jmdictPath)
      ? await readFile(jmdictPath)
      : await loadCachedJmdict(jmdictUrl);

  return gunzipSync(buffer).toString("utf8");
}

async function loadCachedJmdict(jmdictUrl) {
  if (existsSync(defaultJmdictCachePath)) {
    return readFile(defaultJmdictCachePath);
  }

  const response = await fetch(jmdictUrl);

  if (!response.ok) {
    throw new Error(`Failed to download JMdict: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(defaultJmdictCachePath, buffer);
  return buffer;
}

async function readJsonArray(filePath) {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${filePath} to contain a JSON array.`);
  }

  return parsed;
}

async function readOptionalJsonObject(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);

  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed
    : {};
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  await rename(`${filePath}.tmp`, filePath);
}

function parseArgs(argv) {
  const options = {
    cachePath: defaultCachePath,
    concurrency: 6,
    inputPath: defaultInputPath,
    jmdictPath: null,
    jmdictUrl: defaultJmdictUrl,
    limit: null,
    outputPath: defaultOutputPath,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--cache") {
      options.cachePath = path.resolve(rootDir, requireValue(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--input") {
      options.inputPath = path.resolve(rootDir, requireValue(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--concurrency") {
      options.concurrency = Number(requireValue(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--jmdict") {
      options.jmdictPath = path.resolve(rootDir, requireValue(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--jmdict-url") {
      options.jmdictUrl = requireValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--limit") {
      options.limit = Number(requireValue(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--output") {
      options.outputPath = path.resolve(rootDir, requireValue(argv, index, arg));
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function requireValue(argv, index, arg) {
  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`Expected a value after ${arg}.`);
  }

  return value;
}

function buildKey(word, reading) {
  return `${word}\u0000${reading}`;
}

function extractFirst(xml, tagName) {
  const match = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`).exec(xml);
  return match?.[1] ?? "";
}

function extractAll(xml, tagName) {
  return [...xml.matchAll(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "g"))].map(
    (match) => match[1],
  );
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function toHiragana(value) {
  return Array.from(value)
    .map((character) => {
      const codePoint = character.codePointAt(0);

      if (codePoint != null && codePoint >= 0x30a1 && codePoint <= 0x30f6) {
        return String.fromCodePoint(codePoint - 0x60);
      }

      return character;
    })
    .join("");
}
