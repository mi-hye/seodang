import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const rootDir = process.cwd();
const defaultReviewPath = path.join(
  rootDir,
  "data/generated/kanji-enrichment-review.generated.json",
);
const defaultSpecialReadingsPath = path.join(
  rootDir,
  "data/generated/kanji-special-readings.generated.json",
);
const defaultOutputPath = path.join(
  rootDir,
  "data/generated/kanji-words.generated.json",
);
const defaultJmdictUrl = "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz";
const defaultCachePath = path.join("/tmp", "JMdict_e.gz");

const options = parseArgs(process.argv.slice(2));
const [reviewRows, specialReadingRows, jmdictXml] = await Promise.all([
  readJsonArray(options.reviewPath),
  readOptionalJsonArray(options.specialReadingsPath),
  loadJmdictXml(options.jmdictPath, options.jmdictUrl),
]);

const specialWordsById = buildSpecialWordsById(specialReadingRows);
const candidatesByLiteral = buildCandidatesByLiteral(jmdictXml);
const outputRows = buildOutputRows({
  candidatesByLiteral,
  reviewRows,
  specialWordsById,
});

await mkdir(path.dirname(options.outputPath), { recursive: true });
await writeJson(options.outputPath, outputRows);

const wordCount = outputRows.reduce((sum, row) => sum + row.words.length, 0);
console.log(
  `Generated ${wordCount} word entries for ${outputRows.length} kanji rows at ${path.relative(rootDir, options.outputPath)}.`,
);

function buildOutputRows({ candidatesByLiteral, reviewRows, specialWordsById }) {
  return reviewRows
    .map((row) => {
      const literal = typeof row.literal === "string" ? row.literal : "";
      const candidates = candidatesByLiteral.get(literal) ?? [];
      const excludedWords = new Set(specialWordsById.get(row.id) ?? []);
      const words = [];
      const seen = new Set();

      for (const candidate of candidates) {
        if (row.exampleJa?.includes(candidate.word)) {
          continue;
        }

        if (excludedWords.has(candidate.word)) {
          continue;
        }

        const key = `${candidate.word}:${candidate.reading}`;
        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        words.push({
          word: candidate.word,
          reading: candidate.reading,
          meaningKo: null,
          meaningJa: null,
        });

        if (words.length >= 3) {
          break;
        }
      }

      return words.length > 0
        ? {
            id: row.id,
            literal,
            reviewStatus: "approved",
            words,
          }
        : null;
    })
    .filter(Boolean);
}

function buildCandidatesByLiteral(xml) {
  const byLiteral = new Map();
  const entryPattern = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryPattern.exec(xml))) {
    const entryXml = match[1];

    if (shouldSkipEntry(entryXml)) {
      continue;
    }

    const kanjiElements = extractKanjiElements(entryXml);
    const readingElements = extractReadingElements(entryXml);

    if (kanjiElements.length === 0 || readingElements.length === 0) {
      continue;
    }

    for (const kanjiElement of kanjiElements) {
      if (!isUsefulWord(kanjiElement.word) || kanjiElement.infos.length > 0) {
        continue;
      }

      for (const readingElement of readingElements) {
        if (
          readingElement.restrictedTo.length > 0 &&
          !readingElement.restrictedTo.includes(kanjiElement.word)
        ) {
          continue;
        }

        const reading = toHiragana(readingElement.reading);

        if (!isUsefulReading(reading)) {
          continue;
        }

        const kanjiPriority = scorePriority(kanjiElement.priorities);

        if (kanjiPriority <= 0) {
          continue;
        }

        const readingPriority = scorePriority(readingElement.priorities);
        const priority = kanjiPriority + Math.floor(readingPriority / 4);

        for (const literal of unique(Array.from(kanjiElement.word).filter(isKanji))) {
          const candidate = {
            word: kanjiElement.word,
            reading,
            score:
              priority +
              scoreWordShape(kanjiElement.word) +
              scoreLength(kanjiElement.word) +
              scoreLiteralPosition(kanjiElement.word, literal),
          };

          if (!byLiteral.has(literal)) {
            byLiteral.set(literal, []);
          }

          byLiteral.get(literal).push(candidate);
        }
      }
    }
  }

  for (const [literal, candidates] of byLiteral) {
    const bestByWord = new Map();

    for (const candidate of candidates) {
      const existing = bestByWord.get(candidate.word);

      if (!existing || candidate.score > existing.score) {
        bestByWord.set(candidate.word, candidate);
      }
    }

    byLiteral.set(
      literal,
      [...bestByWord.values()].sort(
        (a, b) => b.score - a.score || a.word.length - b.word.length || a.word.localeCompare(b.word, "ja"),
      ),
    );
  }

  return byLiteral;
}

function extractKanjiElements(entryXml) {
  return [...entryXml.matchAll(/<k_ele>([\s\S]*?)<\/k_ele>/g)]
    .map((match) => {
      const xml = match[1];
      return {
        word: decodeXml(extractFirst(xml, "keb")),
        priorities: extractAll(xml, "ke_pri").map(decodeXml),
        infos: extractAll(xml, "ke_inf").map(decodeXml),
      };
    })
    .filter((row) => row.word);
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
        priorities: extractAll(xml, "re_pri").map(decodeXml),
        restrictedTo: extractAll(xml, "re_restr").map(decodeXml),
      };
    })
    .filter(Boolean)
    .filter((row) => row.reading);
}

function scorePriority(priorities) {
  let score = 0;

  for (const priority of priorities) {
    if (["ichi1", "news1", "spec1", "gai1"].includes(priority)) {
      score += 60;
      continue;
    }

    if (["ichi2", "news2", "spec2", "gai2"].includes(priority)) {
      score += 35;
      continue;
    }

    const nfMatch = /^nf(\d{2})$/.exec(priority);
    if (nfMatch) {
      score += Math.max(1, 80 - Number(nfMatch[1]) * 2);
    }
  }

  return score;
}

function scoreLength(word) {
  const length = Array.from(word).length;

  if (length === 2) return 20;
  if (length === 3) return 16;
  if (length === 4) return 12;
  if (length === 5) return 6;
  return 0;
}

function scoreWordShape(word) {
  if (isAllKanji(word)) {
    return 70;
  }

  if (/^[\p{Script=Han}]+[ぁ-ゖ]+$/u.test(word)) {
    return 8;
  }

  return 0;
}

function scoreLiteralPosition(word, literal) {
  return word.startsWith(literal) ? 8 : 0;
}

function shouldSkipEntry(entryXml) {
  return [
    "<misc>&arch;</misc>",
    "<misc>&chn;</misc>",
    "<misc>&col;</misc>",
    "<misc>&obs;</misc>",
    "<misc>&obsc;</misc>",
    "<misc>&rare;</misc>",
    "<misc>&sl;</misc>",
    "<misc>&vulg;</misc>",
  ].some((marker) => entryXml.includes(marker));
}

function isUsefulWord(value) {
  const characters = Array.from(value);

  return (
    characters.length >= 2 &&
    characters.length <= 5 &&
    characters.some(isKanji) &&
    !/[々ヶケ〇０-９0-9]/u.test(value) &&
    /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々ヶー]+$/u.test(value)
  );
}

function isAllKanji(value) {
  return Array.from(value).every(isKanji);
}

function isUsefulReading(value) {
  return /^[\u3041-\u3096ー]+$/u.test(value);
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

function buildSpecialWordsById(rows) {
  const byId = new Map();

  for (const row of rows) {
    if (!row?.id || !Array.isArray(row.specialReadings)) {
      continue;
    }

    byId.set(
      row.id,
      row.specialReadings
        .map((specialReading) => specialReading?.word)
        .filter((word) => typeof word === "string" && word),
    );
  }

  return byId;
}

async function loadJmdictXml(jmdictPath, jmdictUrl) {
  const buffer =
    jmdictPath && existsSync(jmdictPath)
      ? await readFile(jmdictPath)
      : await loadCachedJmdict(jmdictUrl);

  return gunzipSync(buffer).toString("utf8");
}

async function loadCachedJmdict(jmdictUrl) {
  if (existsSync(defaultCachePath)) {
    return readFile(defaultCachePath);
  }

  const response = await fetch(jmdictUrl);

  if (!response.ok) {
    throw new Error(`Failed to download JMdict: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(defaultCachePath, buffer);
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

async function readOptionalJsonArray(filePath) {
  if (!existsSync(filePath)) {
    return [];
  }

  return readJsonArray(filePath);
}

async function writeJson(filePath, value) {
  await writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  await rename(`${filePath}.tmp`, filePath);
}

function parseArgs(argv) {
  const options = {
    jmdictPath: null,
    jmdictUrl: defaultJmdictUrl,
    outputPath: defaultOutputPath,
    reviewPath: defaultReviewPath,
    specialReadingsPath: defaultSpecialReadingsPath,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

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

    if (arg === "--output") {
      options.outputPath = path.resolve(rootDir, requireValue(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--review") {
      options.reviewPath = path.resolve(rootDir, requireValue(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--special-readings") {
      options.specialReadingsPath = path.resolve(rootDir, requireValue(argv, index, arg));
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

function isKanji(value) {
  return /^\p{Script=Han}$/u.test(value);
}

function unique(values) {
  return [...new Set(values)];
}
