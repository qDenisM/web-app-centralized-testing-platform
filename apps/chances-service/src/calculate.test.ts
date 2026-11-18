/**
 * Run: npx tsx apps/chances-service/src/calculate.test.ts
 */
import assert from "node:assert/strict";
import {
  contestAttestatAverage,
  evaluateChance,
  type CatalogSpecialty,
} from "./calculate.js";

const specialty: CatalogSpecialty = {
  id: "s1",
  subjects: [
    { subjectId: "math", slot: 1 },
    { subjectId: "phys", slot: 2 },
    { subjectId: "rus", slot: 3 },
  ],
  passingScores: [{ year: 2025, score: 300, competition: 2 }],
};

const scoresBySubject = new Map([
  ["math", 85],
  ["phys", 78],
  ["rus", 77],
]);

assert.equal(
  contestAttestatAverage({ attestatAverage: 9, verification: { status: "pending" } }),
  null,
);
assert.equal(
  contestAttestatAverage({
    attestatAverage: 9,
    verification: { status: "approved" },
  }),
  9,
);

const withoutApproved = evaluateChance({
  specialty,
  attestatAverage: contestAttestatAverage({
    attestatAverage: 9,
    verification: { status: "pending" },
  }),
  scoresBySubject,
});
assert.equal(withoutApproved.probability, 0);
assert.equal(withoutApproved.status, "red");

const withApproved = evaluateChance({
  specialty,
  attestatAverage: contestAttestatAverage({
    attestatAverage: 9,
    verification: { status: "approved" },
  }),
  scoresBySubject,
});
// contestScore = 85+78+77 + 9*10 = 330; gap vs 300 = +30 → green
assert.equal(withApproved.status, "green");
assert.equal(withApproved.scoreGap, 30);

// Approved attestat only (dashboard may show ~90/400) — missing CT → 0%, null gap
const attestatOnly = evaluateChance({
  specialty,
  attestatAverage: contestAttestatAverage({
    attestatAverage: 9,
    verification: { status: "approved" },
  }),
  scoresBySubject: new Map(),
});
assert.equal(attestatOnly.probability, 0);
assert.equal(attestatOnly.scoreGap, null);
assert.equal(attestatOnly.status, "red");

// Full CT but far below passing: contest = 120 + 90 = 210 vs 300
const farBelow = evaluateChance({
  specialty,
  attestatAverage: 9,
  scoresBySubject: new Map([
    ["math", 40],
    ["phys", 40],
    ["rus", 40],
  ]),
});
assert.equal(farBelow.status, "red");
assert.equal(farBelow.scoreGap, -90);
assert.equal(farBelow.probability, 0);

console.log("calculate.test.ts: all assertions passed");
