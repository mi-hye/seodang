import test from "node:test";
import assert from "node:assert/strict";

const { buildReviewSession } = await import("./reviewSession.ts");

test("builds review session progress and next character", () => {
  const session = buildReviewSession({
    currentCharacterId: "b",
    encodedReviewIds: "a,b,c",
  });

  assert.equal(session.isReviewSession, true);
  assert.deepEqual(session.characterIds, ["a", "b", "c"]);
  assert.equal(session.currentIndex, 1);
  assert.equal(session.nextCharacterId, "c");
  assert.equal(session.position, 2);
  assert.equal(session.total, 3);
});

test("deduplicates blank and repeated review ids", () => {
  const session = buildReviewSession({
    currentCharacterId: "a",
    encodedReviewIds: "a,,b,a",
  });

  assert.deepEqual(session.characterIds, ["a", "b"]);
  assert.equal(session.nextCharacterId, "b");
});

test("returns an inactive session when ids are missing", () => {
  const session = buildReviewSession({
    currentCharacterId: "a",
    encodedReviewIds: undefined,
  });

  assert.equal(session.isReviewSession, false);
  assert.deepEqual(session.characterIds, []);
  assert.equal(session.nextCharacterId, undefined);
});
