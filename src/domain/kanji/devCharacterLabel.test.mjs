import test from "node:test";
import assert from "node:assert/strict";

const { getDevCharacterIdLabel } = await import("./devCharacterLabel.ts");

test("shows the character id only in development mode", () => {
  assert.equal(
    getDevCharacterIdLabel({ characterId: "u065e5", isDevelopment: true }),
    "ID u065e5",
  );
  assert.equal(
    getDevCharacterIdLabel({ characterId: "u065e5", isDevelopment: false }),
    null,
  );
});
