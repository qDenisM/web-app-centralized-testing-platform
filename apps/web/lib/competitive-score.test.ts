/**
 * Run: npx tsx apps/web/lib/competitive-score.test.ts
 */
import assert from "node:assert/strict";
import {
  computeCompetitiveScore,
  isAttestatVerified,
} from "./competitive-score.ts";
import type { ApplicantProfile } from "./applicant.ts";
import type { CtResult } from "./results.ts";

function profile(
  partial: Partial<ApplicantProfile> & {
    verification?: ApplicantProfile["verification"];
  },
): ApplicantProfile {
  return {
    id: "p1",
    userId: "u1",
    birthDate: null,
    passportSeries: null,
    passportNumber: null,
    storageKey: null,
    hasAttestatScan: false,
    attestatAverage: null,
    schoolName: null,
    graduateName: null,
    attestatIssuedOn: null,
    selectedCtResultIds: [],
    createdAt: new Date().toISOString(),
    verification: null,
    ...partial,
  };
}

function result(examId: string, score: number): CtResult {
  return {
    id: `r-${examId}`,
    examId,
    userId: "u1",
    score,
    status: "published",
    enteredBy: null,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const exams = [
  { id: "e1", subjectId: "math" },
  { id: "e2", subjectId: "phys" },
  { id: "e3", subjectId: "rus" },
];

const results = [result("e1", 85), result("e2", 78), result("e3", 77)];

assert.equal(isAttestatVerified(profile({ attestatAverage: 9 })), false);
assert.equal(
  isAttestatVerified(
    profile({
      attestatAverage: 9,
      verification: {
        id: "v1",
        version: 1,
        status: "pending",
        rejectReason: null,
        lockedBy: null,
        submittedAt: null,
        decidedAt: null,
      },
    }),
  ),
  false,
);
assert.equal(
  isAttestatVerified(
    profile({
      attestatAverage: 9,
      verification: {
        id: "v1",
        version: 1,
        status: "approved",
        rejectReason: null,
        lockedBy: null,
        submittedAt: null,
        decidedAt: null,
      },
    }),
  ),
  true,
);

const pending = computeCompetitiveScore({
  results,
  exams,
  profile: profile({
    attestatAverage: 9,
    verification: {
      id: "v1",
      version: 1,
      status: "pending",
      rejectReason: null,
      lockedBy: null,
      submittedAt: null,
      decidedAt: null,
    },
  }),
});
assert.equal(pending.ctSum, 240);
assert.equal(pending.attestatPoints, null);
// CT alone still forms a partial competitive total; attestat waits for approval.
assert.equal(pending.competitive, 240);

const approved = computeCompetitiveScore({
  results,
  exams,
  profile: profile({
    attestatAverage: 9,
    verification: {
      id: "v1",
      version: 1,
      status: "approved",
      rejectReason: null,
      lockedBy: null,
      submittedAt: null,
      decidedAt: null,
    },
  }),
});
assert.equal(approved.ctSum, 240);
assert.equal(approved.attestatPoints, 90);
assert.equal(approved.competitive, 330);

const noCt = computeCompetitiveScore({
  results: [],
  exams,
  profile: profile({
    attestatAverage: 9,
    verification: {
      id: "v1",
      version: 1,
      status: "approved",
      rejectReason: null,
      lockedBy: null,
      submittedAt: null,
      decidedAt: null,
    },
  }),
});
assert.equal(noCt.ctSum, 0);
assert.equal(noCt.attestatPoints, 90);
assert.equal(noCt.competitive, 90);

const ctOnly = computeCompetitiveScore({
  results,
  exams,
  profile: profile({ attestatAverage: 9 }),
});
assert.equal(ctOnly.ctSum, 240);
assert.equal(ctOnly.attestatPoints, null);
assert.equal(ctOnly.competitive, 240);

const empty = computeCompetitiveScore({
  results: [],
  exams,
  profile: profile({ attestatAverage: null }),
});
assert.equal(empty.attestatPoints, null);
assert.equal(empty.competitive, null);

const many = [
  result("e1", 90),
  result("e2", 80),
  result("e3", 70),
  result("e4", 60),
];
const manyExams = [
  ...exams,
  { id: "e4", subjectId: "chem" },
];
const capped = computeCompetitiveScore({
  results: many,
  exams: manyExams,
  profile: profile({}),
});
assert.equal(capped.subjectScores.length, 3);
assert.equal(capped.ctSum, 240);

const selected = computeCompetitiveScore({
  results: many,
  exams: manyExams,
  profile: profile({ selectedCtResultIds: ["r-e2", "r-e4"] }),
});
assert.equal(selected.ctSum, 140);
assert.equal(selected.subjectScores.length, 2);

console.log("competitive-score.test.ts: all assertions passed");
