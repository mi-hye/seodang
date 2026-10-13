import test from "node:test";
import assert from "node:assert/strict";
import { freshState, reduce } from "../src/engine.js";
import { load, save, reset, STORAGE_KEY } from "../src/storage.js";
import { AudioPlayer, audioManifest } from "../src/media.js";
const act = (s, type, extra = {}) => reduce(s, { type, ...extra });
const investigate = () => {
  let s = freshState();
  for (let i = 0; i < 4; i++) s = act(s, "next");
  return s;
};
const memory = () => {
  const m = new Map();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
};
test("visible request needs no hidden clue clicks; wrong color and location retry; completion idempotent", () => {
  let s = investigate();
  assert.equal(s.episode.step, "investigate");
  assert.equal(s.encountered.length, 2);
  s = act(s, "submit");
  assert.equal(s.episode.solved, false);
  assert.match(s.episode.feedback, /골라/);
  assert.deepEqual(s.episode.clues, []);
  for (const [id, match] of [
    ["bag-door-blue", /위치/],
    ["bag-window-red", /색/],
  ]) {
    s = act(s, "select", { id });
    s = act(s, "submit");
    assert.match(s.episode.feedback, match);
    assert.equal(s.episode.solved, false);
  }
  s = act(s, "select", { id: "bag-window-blue" });
  s = act(s, "submit");
  assert.equal(s.episode.solved, true);
  assert.equal(s.episode.attempts, 3);
  s = act(s, "submit");
  assert.equal(s.episode.attempts, 3);
  s = act(s, "next");
  s = act(s, "transfer", { id: "book" });
  assert.equal(s.episode.solved, true);
  assert.equal(s.episode.transfer, "retry");
  s = act(s, "next");
  assert.equal(s.episode.step, "transfer");
  s = act(s, "transfer", { id: "cup" });
  s = act(s, "next");
  assert.equal(s.episode.step, "summary");
  assert.equal(s.episode.transferAttempts, 2);
  s = act(s, "restart");
  assert.equal(s.episode.solved, false);
  assert.equal(s.encountered.length, 2);
});
test("hints bounded, no score penalty, state not mutated", () => {
  const orig = investigate();
  let s = orig;
  for (let i = 0; i < 10; i++) s = act(s, "hint");
  assert.equal(s.episode.hintLevel, 3);
  assert.equal(orig.episode.hintLevel, 0);
  assert.equal(s.episode.attempts, 0);
});
test("save/restore and reset isolate storage key", () => {
  const m = memory();
  m.setItem("production-user", "untouched");
  const s = investigate();
  assert.equal(save(m, s), "");
  assert.deepEqual(load(m).state, s);
  reset(m);
  assert.equal(m.getItem("production-user"), "untouched");
  assert.equal(m.getItem(STORAGE_KEY), null);
});
test("corrupt/unknown version record is preserved; failing storage keeps session", () => {
  for (const raw of [
    "broken",
    JSON.stringify({ ...freshState(), schemaVersion: 99 }),
    JSON.stringify({ ...freshState(), settings: {} }),
  ]) {
    const m = memory();
    m.setItem(STORAGE_KEY, raw);
    assert.equal(load(m).blocked, true);
    assert.equal(m.getItem(STORAGE_KEY), raw);
  }
  const broken = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  };
  assert.equal(load(broken).blocked, true);
  const s = investigate();
  assert.match(save(broken, s), /저장하지 못/);
  assert.equal(s.episode.step, "investigate");
});
test("device TTS is explicit; file fallback does not overlap and failure is recoverable", async () => {
  const entries = Object.values(audioManifest);
  assert.ok(
    entries.every((x) => x.locale === "ja-JP" ? x.status === "ready" && x.audioFile : x.status === "device-tts" && x.audioFile === null),
  );
  let created = 0,
    paused = 0,
    errors = 0;
  const p = new AudioPlayer(() => {
    created++;
    return {
      currentTime: 0,
      pause() {
        paused++;
      },
      async play() { queueMicrotask(() => this.onended?.()); },
    };
  });
  await p.play({ status: "missing", audioFile: null }, true, () => errors++);
  assert.equal(created, 0);
  const ready = { audioFile: "test.mp3", status: "ready" };
  await p.play(ready, true, () => errors++);
  await p.play(ready, true, () => errors++);
  assert.equal(paused, 1);
  p.stop();
  assert.equal(paused, 2);
  const failing = new AudioPlayer(() => ({
    pause() {},
    async play() {
      throw Error();
    },
  }));
  await failing.play(ready, true, () => errors++);
  assert.equal(errors, 1);
});
