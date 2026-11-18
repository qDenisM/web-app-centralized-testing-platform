/**
 * Run: npx tsx apps/web/lib/chances-display.test.ts
 */
import assert from "node:assert/strict";
import {
  catalogChanceDetail,
  catalogChanceLabel,
  catalogChancePercent,
  formatChanceBadge,
  isChanceIncomplete,
} from "./chances-display.ts";

const incomplete = {
  status: "red" as const,
  probability: 0,
  scoreGap: null,
};
const farBelow = {
  status: "red" as const,
  probability: 0,
  scoreGap: -90,
};
const strong = {
  status: "green" as const,
  probability: 95,
  scoreGap: 30,
};

assert.equal(isChanceIncomplete(incomplete), true);
assert.equal(isChanceIncomplete(farBelow), false);
assert.equal(catalogChanceLabel("red", incomplete), "Мало данных ЦТ");
assert.equal(catalogChanceLabel("red", farBelow), "Балл ниже проходного");
assert.equal(catalogChancePercent(incomplete), "—");
assert.equal(catalogChancePercent(farBelow), "0%");
assert.equal(formatChanceBadge(incomplete), "Мало данных ЦТ");
assert.equal(formatChanceBadge(strong), "Проходит (95%)");
assert.match(
  catalogChanceDetail(incomplete) ?? "",
  /ЦТ/,
);
assert.equal(catalogChanceDetail(farBelow), "Не хватает: 90 баллов");

console.log("chances-display.test.ts: all assertions passed");
