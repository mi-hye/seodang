import test from "node:test";
import assert from "node:assert/strict";

const { PRO_PRODUCT } = await import("./proProduct.ts");

test("defines a one-time Pro product for purchase integration", () => {
  assert.equal(PRO_PRODUCT.id, "seodang_pro_lifetime");
  assert.equal(PRO_PRODUCT.purchaseType, "one_time");
  assert.equal(PRO_PRODUCT.price.ko, "₩4,900");
  assert.equal(PRO_PRODUCT.price.ja, "¥490");
});

test("includes the first Pro benefits", () => {
  assert.deepEqual(PRO_PRODUCT.benefitKeys, [
    "pro.included.stats",
    "pro.included.mistakeNote",
    "pro.included.focusedReview",
    "pro.included.oneTime",
  ]);
});
