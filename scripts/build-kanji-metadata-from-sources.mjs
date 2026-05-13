import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const kanjidicPath = path.join(rootDir, "data/import/kanjidic2.xml");
const jlptSourcePath = path.join(rootDir, "data/import/jlpt-kanji-source.json");
const generatedDir = path.join(rootDir, "data/generated");
const metadataOutputPath = path.join(generatedDir, "kanji-metadata.generated.json");
const mappingsOutputPath = path.join(
  generatedDir,
  "kanji-character-categories.generated.json"
);

const kanjidicXml = await readText(kanjidicPath);
const jlptSource = await readJson(jlptSourcePath);
const jlptMap = buildJlptMapFromOpenSourceJson(jlptSource);

const characters = parseKanjidicCharacters(kanjidicXml);
const metadataRows = buildMetadataRows(characters, jlptMap);
const mappingRows = buildJlptCategoryMappings(characters, jlptMap);

await mkdir(generatedDir, { recursive: true });
await writeJson(metadataOutputPath, metadataRows);
await writeJson(mappingsOutputPath, mappingRows);

console.log(
  `Generated ${metadataRows.length} kanji metadata rows and ${mappingRows.length} JLPT category mappings.`
);

function parseKanjidicCharacters(xml) {
  const blocks = xml.match(/<character>[\s\S]*?<\/character>/g) ?? [];

  return blocks
    .map(parseCharacterBlock)
    .filter((character) => character && isCjkUnifiedIdeograph(character.literal));
}

function parseCharacterBlock(block) {
  const literal = decodeXml(extractFirst(block, /<literal>([\s\S]*?)<\/literal>/));
  if (!literal) {
    return null;
  }

  const grade = toNumber(extractFirst(block, /<grade>(\d+)<\/grade>/));
  const strokeCount = toNumber(
    extractFirst(block, /<stroke_count>(\d+)<\/stroke_count>/)
  );
  const oldJlptLevel = toNumber(extractFirst(block, /<jlpt>(\d+)<\/jlpt>/));

  const onyomi = extractAll(block, /<reading r_type="ja_on">([\s\S]*?)<\/reading>/g).map(
    decodeXml
  );
  const kunyomi = extractAll(block, /<reading r_type="ja_kun">([\s\S]*?)<\/reading>/g).map(
    decodeXml
  );
  const meaningsEn = extractMeaningEn(block);

  return {
    id: toUnicodeId(literal),
    literal,
    grade,
    strokeCount,
    oldJlptLevel,
    onyomi,
    kunyomi,
    meaningsEn,
  };
}

function buildMetadataRows(characters, jlptMap) {
  const jlptByLiteral = createJlptLookup(jlptMap);

  return characters
    .map((character) => {
      const jlptLevel = jlptByLiteral.get(character.literal) ?? null;
      const schoolInfo = mapJapaneseSchoolInfo(character.grade);

      return {
        id: character.id,
        literal: character.literal,
        strokeCount: character.strokeCount,
        meaningKo: null,
        meaningJa: null,
        onyomi: character.onyomi,
        kunyomi: character.kunyomi,
        jlptLevel,
        japaneseSchoolLevel: schoolInfo.level,
        japaneseGrade: schoolInfo.grade,
        exampleJa: null,
        exampleKo: null,
        sortOrder: null,
        isJoyo: isJoyoGrade(character.grade),
        metadata: {
          meaningEn: character.meaningsEn,
          kanjidicGrade: character.grade,
          kanjidicJlptOld: character.oldJlptLevel,
        },
      };
    })
    .sort((left, right) => left.literal.localeCompare(right.literal, "ja"));
}

function buildJlptCategoryMappings(characters, jlptMap) {
  const availableIds = new Set(characters.map((character) => character.id));
  const rows = [];

  for (const [level, literals] of Object.entries(jlptMap)) {
    const normalizedLevel = normalizeJlptLevel(level);
    const categoryId = `cat_jlpt_${normalizedLevel.toLowerCase()}`;

    for (const literal of literals) {
      const characterId = toUnicodeId(literal);
      if (!availableIds.has(characterId)) {
        continue;
      }

      rows.push({
        characterId,
        categoryId,
      });
    }
  }

  return uniqueRows(rows, (row) => `${row.characterId}:${row.categoryId}`).sort((left, right) =>
    left.characterId.localeCompare(right.characterId, "en")
  );
}

function createJlptLookup(jlptMap) {
  const map = new Map();

  for (const [level, literals] of Object.entries(jlptMap)) {
    const normalizedLevel = normalizeJlptLevel(level);
    for (const literal of literals) {
      map.set(literal, normalizedLevel);
    }
  }

  return map;
}

function buildJlptMapFromOpenSourceJson(source) {
  const grouped = {
    N5: [],
    N4: [],
    N3: [],
    N2: [],
    N1: [],
  };

  for (const [literal, payload] of Object.entries(source)) {
    const level = normalizeOpenSourceJlptLevel(payload?.jlpt);
    if (!level || !grouped[level]) {
      continue;
    }

    grouped[level].push(literal);
  }

  for (const level of Object.keys(grouped)) {
    grouped[level] = [...new Set(grouped[level])].sort((left, right) =>
      left.localeCompare(right, "ja")
    );
  }

  return grouped;
}

function normalizeOpenSourceJlptLevel(level) {
  if (level == null) {
    return null;
  }

  const asString = String(level).trim().toUpperCase();
  if (["N1", "N2", "N3", "N4", "N5"].includes(asString)) {
    return asString;
  }

  if (["1", "2", "3", "4", "5"].includes(asString)) {
    return `N${asString}`;
  }

  return null;
}

function normalizeJlptLevel(level) {
  const upper = String(level).trim().toUpperCase();
  return upper.startsWith("N") ? upper : `N${upper}`;
}

function mapJapaneseSchoolInfo(grade) {
  if (grade >= 1 && grade <= 6) {
    return {
      level: "elementary",
      grade,
    };
  }

  if (grade === 8) {
    return {
      level: "junior_high",
      grade: null,
    };
  }

  return {
    level: null,
    grade: null,
  };
}

function isJoyoGrade(grade) {
  return grade >= 1 && grade <= 6 || grade === 8;
}

function extractMeaningEn(block) {
  const matches = [...block.matchAll(/<meaning([^>]*)>([\s\S]*?)<\/meaning>/g)];

  return matches
    .filter((match) => !/m_lang=/.test(match[1] ?? ""))
    .map((match) => decodeXml(match[2]))
    .filter(Boolean);
}

function extractFirst(text, pattern) {
  const match = text.match(pattern);
  return match?.[1] ?? null;
}

function extractAll(text, pattern) {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

function toUnicodeId(literal) {
  const codePoint = literal.codePointAt(0);
  if (!codePoint) {
    throw new Error(`Unable to derive unicode id for literal: ${literal}`);
  }

  return `u${codePoint.toString(16).padStart(5, "0")}`;
}

function isCjkUnifiedIdeograph(literal) {
  const codePoint = literal.codePointAt(0);
  if (!codePoint) {
    return false;
  }

  return codePoint >= 0x4e00 && codePoint <= 0x9fff;
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function uniqueRows(rows, keyFn) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = keyFn(row);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function toNumber(value) {
  return value == null ? null : Number(value);
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}
