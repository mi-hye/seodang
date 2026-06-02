#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const DEFAULT_PORT = 9223;
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_LOCALE = "en-US";
const DEFAULT_DICTIONARY = "jaen";

function parseArgs(args) {
  const options = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    locale: DEFAULT_LOCALE,
    dictionary: DEFAULT_DICTIONARY,
    literal: "",
  };

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (!options.literal && !value.startsWith("--")) {
      options.literal = value;
      continue;
    }

    if (value === "--port") {
      options.port = Number(args[index + 1] ?? DEFAULT_PORT);
      index += 1;
      continue;
    }

    if (value === "--host") {
      options.host = args[index + 1] ?? DEFAULT_HOST;
      index += 1;
      continue;
    }

    if (value === "--locale") {
      options.locale = args[index + 1] ?? DEFAULT_LOCALE;
      index += 1;
      continue;
    }

    if (value === "--dictionary") {
      options.dictionary = args[index + 1] ?? DEFAULT_DICTIONARY;
      index += 1;
      continue;
    }
  }

  return options;
}

async function createTarget(baseUrl, targetUrl) {
  const response = await fetch(`${baseUrl}/json/new?${targetUrl}`, {
    method: "PUT",
  });

  if (!response.ok) {
    throw new Error(`Failed to create target: ${response.status}`);
  }

  return response.json();
}

async function closeTarget(baseUrl, targetId) {
  await fetch(`${baseUrl}/json/close/${targetId}`);
}

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.eventWaiters = new Map();
    this.socket = null;
    this.openPromise = null;
  }

  connect() {
    this.openPromise = new Promise((resolve, reject) => {
      const socket = new WebSocket(this.webSocketUrl);
      this.socket = socket;

      socket.addEventListener("open", () => resolve());
      socket.addEventListener("message", (event) => this.onMessage(event));
      socket.addEventListener("error", (event) => reject(new Error(String(event.message ?? "WebSocket error"))));
      socket.addEventListener("close", () => {
        for (const pending of this.pending.values()) {
          pending.reject(new Error("CDP socket closed"));
        }
        this.pending.clear();
      });
    });

    return this.openPromise;
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;

    const payload = { id, method, params };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(payload));
    });
  }

  async evaluate(expression, options = {}) {
    await this.openPromise;
    const response = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: options.awaitPromise ?? false,
      returnByValue: options.returnByValue ?? true,
    });

    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.text ?? "Runtime.evaluate failed");
    }

    return response.result?.value;
  }

  waitForEvent(method, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const waiters = this.eventWaiters.get(method) ?? [];
        this.eventWaiters.set(
          method,
          waiters.filter((waiter) => waiter.resolve !== resolve)
        );
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);

      const waiters = this.eventWaiters.get(method) ?? [];
      waiters.push({
        resolve: (params) => {
          clearTimeout(timeoutId);
          resolve(params);
        },
      });
      this.eventWaiters.set(method, waiters);
    });
  }

  async close() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }

  onMessage(event) {
    const message = JSON.parse(event.data.toString());

    if (message.method) {
      const waiters = this.eventWaiters.get(message.method) ?? [];
      if (waiters.length > 0) {
        const [waiter, ...remaining] = waiters;
        this.eventWaiters.set(message.method, remaining);
        waiter.resolve(message.params);
      }
      return;
    }

    if (!Object.hasOwn(message, "id")) {
      return;
    }

    const pending = this.pending.get(message.id);
    if (!pending) {
      return;
    }

    this.pending.delete(message.id);

    if (message.error) {
      pending.reject(new Error(message.error.message ?? "CDP request failed"));
      return;
    }

    pending.resolve(message.result);
  }
}

function buildExtractionExpression(literal, { includeStrokes = true } = {}) {
  return `
    (async () => {
      const targetLiteral = ${JSON.stringify(literal)};
      const includeStrokes = ${JSON.stringify(includeStrokes)};

      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const findDetailDrawButton = () =>
        document.querySelector('.detail-kanji-header .box-btn-right-df button img[alt="draw"]')?.closest('button');

      const parseNumbers = (path) =>
        (path.match(/-?\\d*\\.?\\d+/g) ?? []).map((value) => Number(value));

      const toPairs = (numbers) => {
        const pairs = [];
        for (let index = 0; index + 1 < numbers.length; index += 2) {
          pairs.push({ x: numbers[index], y: numbers[index + 1] });
        }
        return pairs;
      };

      const classifyDirection = (start, end) => {
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
      };

      const normalizePoint = (point, bounds) => ({
        x: Math.round(((point.x - bounds.minX) / Math.max(1, bounds.maxX - bounds.minX)) * 100),
        y: Math.round(((point.y - bounds.minY) / Math.max(1, bounds.maxY - bounds.minY)) * 100),
      });

      const waitFor = async (fn, timeoutMs = 10000) => {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
          const value = fn();
          if (value) {
            return value;
          }
          await sleep(200);
        }
        return null;
      };

      await waitFor(
        () =>
          findDetailDrawButton() ||
          document.querySelector('.title-detail-kanji span') ||
          document.querySelector('a[href*="/search/kanji/"]'),
        10000
      );
      await sleep(500);

      const pageText = document.body.innerText || "";
      const splitValues = (text) =>
        (text || '')
          .split(/[;,]/)
          .map((value) => value.trim())
          .filter(Boolean);

      const kunyomi = [...document.querySelectorAll('.item-infor-kun .txt-kun, .item-infor-kun .txt-item')]
        .map((element) => (element.textContent || '').trim())
        .filter(Boolean);
      const onyomi = [...document.querySelectorAll('.item-infor-on .txt-on, .item-infor-on .txt-item')]
        .flatMap((element) => splitValues(element.textContent || ''))
        .filter(Boolean);
      const meaningBlockText = [...document.querySelectorAll('.line-item.flex-column.align-items-start.box-play-audio.box-section, .line-item.box-play-audio.box-section')]
        .map((element) => (element.innerText || '').trim())
        .find((value) => value.includes('의미') || value.includes('Meaning') || value.includes('意味')) ?? null;
      const meanings = [...document.querySelectorAll('app-kanji .item-list li, app-kanji .item-list, .line-item.box-play-audio.box-section li')]
        .flatMap((element) => splitValues(element.textContent || ''))
        .map((value) => value.trim())
        .filter(Boolean);
      const titleHeading = document.querySelector('.title-detail-kanji span')?.textContent?.trim() ?? targetLiteral;
      const subtitle = document.querySelector('app-kanji p.visually-hidden')?.textContent?.trim() ?? null;
      const strokeCountText = [...document.querySelectorAll('.line-item, .item-title, .item-infor')]
        .map((element) => (element.textContent || '').trim())
        .find((value) => /^Strokes\\s*\\d+$/i.test(value.replace(/\\s+/g, ' '))) ?? null;

      let svg = null;
      let bounds = null;
      let strokes = [];

      if (includeStrokes) {
        const drawButton = await waitFor(findDetailDrawButton);
        if (!drawButton) {
          throw new Error("Mazii detail draw button not found");
        }

        drawButton.click();

        const readyPath = await waitFor(() => document.querySelector('#search-kanji-draw svg g path[clip-path]'));
        svg = readyPath?.closest('svg') ?? document.querySelector('#search-kanji-draw svg');
        if (!svg || !readyPath) {
          throw new Error("Mazii practice SVG did not finish rendering");
        }

        const maskPathById = Object.fromEntries(
          [...svg.querySelectorAll('clipPath[id]')].map((clipPath) => [
            clipPath.id,
            clipPath.querySelector('path')?.getAttribute('d') ?? null,
          ])
        );

        const rawGuidePaths = [...svg.querySelectorAll('g path[clip-path]')].map((pathElement) => ({
          guidePath: pathElement.getAttribute('d'),
          clipPath: pathElement.getAttribute('clip-path'),
          stroke: pathElement.getAttribute('stroke'),
        }));

        const uniqueGuidePaths = [...new Map(
          rawGuidePaths
            .filter((item) => item.guidePath)
            .map((item) => [item.guidePath, item])
        ).values()];

        const allPoints = uniqueGuidePaths.flatMap((item) => toPairs(parseNumbers(item.guidePath)));
        bounds = allPoints.reduce(
          (accumulator, point) => ({
            minX: Math.min(accumulator.minX, point.x),
            minY: Math.min(accumulator.minY, point.y),
            maxX: Math.max(accumulator.maxX, point.x),
            maxY: Math.max(accumulator.maxY, point.y),
          }),
          {
            minX: Number.POSITIVE_INFINITY,
            minY: Number.POSITIVE_INFINITY,
            maxX: Number.NEGATIVE_INFINITY,
            maxY: Number.NEGATIVE_INFINITY,
          }
        );

        strokes = uniqueGuidePaths.map((item, index) => {
          const maskId = item.clipPath?.match(/#([^")]+)/)?.[1] ?? null;
          const points = toPairs(parseNumbers(item.guidePath));
          const start = points[0];
          const end = points[points.length - 1];
          const normalizedStart = normalizePoint(start, bounds);
          const normalizedEnd = normalizePoint(end, bounds);

          return {
            order: index + 1,
            guidePath: item.guidePath,
            maskId,
            maskPath: maskId ? maskPathById[maskId] ?? null : null,
            start: normalizedStart,
            end: normalizedEnd,
            direction: classifyDirection(normalizedStart, normalizedEnd),
          };
        });
      }

      const exampleEntries = [...document.querySelectorAll('a[href*="/search/kanji/"]')]
        .map((anchor) => {
          const container = anchor.closest('[class*="ng-star-inserted"], tr, li, div');
          const rawText = (container?.innerText || anchor.innerText || '').trim();
          const parts = rawText.split('\\t').map((value) => value.trim()).filter(Boolean);

          if (parts.length < 2) {
            return null;
          }

          return {
            term: parts[0] ?? null,
            reading: parts[1] ?? null,
            glossKo: parts.slice(2).join(' ').trim() || null,
            rawText,
          };
        })
        .filter((entry) => entry && entry.term)
        .filter((entry, index, entries) =>
          entries.findIndex((candidate) => candidate.term === entry.term && candidate.reading === entry.reading) === index
        );

      return {
        literal: targetLiteral,
        pageTitle: document.title,
        source: "Mazii",
        svgUrl: window.imgKanji ?? null,
        titleLiteral: titleHeading,
        subtitle,
        meaningText: meaningBlockText,
        meanings,
        kunyomi,
        onyomi,
        meaningJa: null,
        meaningJaSource: null,
        examples: exampleEntries,
        strokeCountLabel: strokeCountText,
        svgWidth: svg?.getAttribute('width') ?? null,
        svgHeight: svg?.getAttribute('height') ?? null,
        strokeCount: strokes.length,
        pageTextSample: pageText.slice(0, 500),
        bounds,
        strokes,
      };
    })()
  `;
}

function buildAvailabilityExpression(literal) {
  return `
    (async () => {
      const targetLiteral = ${JSON.stringify(literal)};
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const waitFor = async (fn, timeoutMs = 10000) => {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
          const value = fn();
          if (value) {
            return value;
          }
          await sleep(200);
        }
        return null;
      };

      const findDrawButton = () =>
        document.querySelector('.detail-kanji-header .box-btn-right-df button img[alt="draw"]')?.closest('button');

      const drawButton = await waitFor(findDrawButton, 8000);
      const pageText = document.body.innerText || "";
      const titleLiteral = document.querySelector('.title-detail-kanji span')?.textContent?.trim() ?? targetLiteral;

      if (!drawButton) {
        return {
          literal: targetLiteral,
          titleLiteral,
          hasDrawButton: false,
          hasSvgPaths: false,
          failureReason: "draw_button_not_found",
          pageTextSample: pageText.slice(0, 500),
        };
      }

      drawButton.click();
      const readyPath = await waitFor(
        () => document.querySelector('#search-kanji-draw svg g path[clip-path]'),
        8000
      );

      const pathCount = document.querySelectorAll('#search-kanji-draw svg g path[clip-path]').length;

      return {
        literal: targetLiteral,
        titleLiteral,
        hasDrawButton: true,
        hasSvgPaths: Boolean(readyPath),
        pathCount,
        failureReason: readyPath ? null : "svg_paths_not_found",
        pageTextSample: pageText.slice(0, 500),
      };
    })()
  `;
}

async function withMaziiPage({
  literal,
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  locale = DEFAULT_LOCALE,
  dictionary = DEFAULT_DICTIONARY,
  evaluateExpression,
}) {
  if (!literal) {
    throw new Error("literal is required");
  }

  const baseUrl = `http://${host}:${port}`;
  const targetUrl = `https://mazii.net/${locale}/search/kanji/${dictionary}/${encodeURIComponent(literal)}`;
  const target = await createTarget(baseUrl, "about:blank");
  const client = new CdpClient(target.webSocketDebuggerUrl);

  try {
    await client.connect();
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Page.navigate", { url: targetUrl });
    await client.waitForEvent("Page.loadEventFired", 15000);
    return await client.evaluate(evaluateExpression, {
      awaitPromise: true,
      returnByValue: true,
    });
  } finally {
    await client.close().catch(() => undefined);
    await closeTarget(baseUrl, target.id).catch(() => undefined);
  }
}

export async function checkMaziiStrokeAvailability(options = {}) {
  const literal = options.literal;
  return withMaziiPage({
    ...options,
    literal,
    evaluateExpression: buildAvailabilityExpression(literal),
  });
}

export async function probeMaziiStrokes({
  literal,
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  locale = DEFAULT_LOCALE,
  dictionary = DEFAULT_DICTIONARY,
} = {}) {
  return withMaziiPage({
    literal,
    host,
    port,
    locale,
    dictionary,
    evaluateExpression: buildExtractionExpression(literal, { includeStrokes: true }),
  });
}

export async function probeMaziiEntry({
  literal,
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  locale = DEFAULT_LOCALE,
  dictionary = DEFAULT_DICTIONARY,
} = {}) {
  return withMaziiPage({
    literal,
    host,
    port,
    locale,
    dictionary,
    evaluateExpression: buildExtractionExpression(literal, { includeStrokes: false }),
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const literal = options.literal;

  if (!literal) {
    throw new Error("Usage: node scripts/probe-mazii-strokes.mjs <kanji> [--port 9223] [--locale ko-KR] [--dictionary jako]");
  }

  const result = await probeMaziiStrokes(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
