import type { ApplicantProfile } from "@/lib/applicant";
import type { CtResult } from "@/lib/results";

export type ExamSubjectRef = {
  id: string;
  subjectId: string;
};

export const MAX_CT_RESULTS_FOR_SCORE = 3;

/** Attestat counts in the contest only after moderator approval. */
export function isAttestatVerified(
  profile: ApplicantProfile | null | undefined,
): boolean {
  const status = profile?.verification?.status;
  return status === "approved" || status === "verified";
}

/**
 * Which published CT rows count toward competitive score.
 * - If profile.selectedCtResultIds is non-empty → those IDs only (already ≤3).
 * - Otherwise → all published, later capped to top 3 by score (per subject).
 */
export function filterSelectedCtResults(
  results: CtResult[],
  selectedIds: string[] | null | undefined,
): CtResult[] {
  const published = results.filter(
    (row) => row.status === "published" && typeof row.score === "number",
  );
  if (!selectedIds || selectedIds.length === 0) return published;
  const set = new Set(selectedIds);
  return published.filter((row) => set.has(row.id));
}

/**
 * Competitive score = sum of selected/best published CT scores (max 3 subjects)
 * + attestat×10 when approved.
 * Returns a numeric total whenever at least one component exists
 * (approved attestat and/or published CT); otherwise null.
 *
 * Default when nothing selected: best score per subject, then top 3 by score.
 * Explicit selection: only selected published results (API-capped at 3).
 */
export function computeCompetitiveScore(input: {
  results: CtResult[];
  profile: ApplicantProfile | null | undefined;
  exams?: ExamSubjectRef[];
  maxCtResults?: number;
}): {
  ctSum: number;
  attestatPoints: number | null;
  competitive: number | null;
  subjectScores: Array<{ subjectId: string; score: number; resultId?: string }>;
} {
  const max = input.maxCtResults ?? MAX_CT_RESULTS_FOR_SCORE;
  const examById = new Map(
    (input.exams || []).map((exam) => [exam.id, exam] as const),
  );
  const requireExamMap = (input.exams?.length ?? 0) > 0;
  const selectedIds = input.profile?.selectedCtResultIds;
  const explicit = Boolean(selectedIds && selectedIds.length > 0);
  const candidates = filterSelectedCtResults(input.results, selectedIds);

  const best = new Map<
    string,
    { subjectId: string; score: number; resultId: string }
  >();
  for (const row of candidates) {
    if (typeof row.score !== "number") continue;
    const exam = examById.get(row.examId);
    if (requireExamMap && !exam) continue;
    const subjectId = row.subjectId || exam?.subjectId || row.examId;
    const prev = best.get(subjectId);
    if (!prev || row.score > prev.score) {
      best.set(subjectId, {
        subjectId,
        score: row.score,
        resultId: row.id,
      });
    }
  }

  let subjectScores = [...best.values()].sort((a, b) => b.score - a.score);
  // Always cap at max; for default (no selection) this is "top 3 by score".
  subjectScores = subjectScores.slice(0, max);
  // When explicit selection is set but somehow more than max survived, still cap.
  if (explicit && selectedIds) {
    const set = new Set(selectedIds);
    subjectScores = subjectScores
      .filter((row) => set.has(row.resultId))
      .slice(0, max);
  }

  const ctSum = subjectScores.reduce((acc, row) => acc + row.score, 0);

  const attestat = input.profile?.attestatAverage;
  const attestatPoints =
    attestat == null || !isAttestatVerified(input.profile)
      ? null
      : Math.round(attestat * 10 * 10) / 10;

  if (attestatPoints == null && subjectScores.length === 0) {
    return { ctSum, attestatPoints, competitive: null, subjectScores };
  }

  return {
    ctSum,
    attestatPoints,
    competitive: Math.round((ctSum + (attestatPoints ?? 0)) * 10) / 10,
    subjectScores,
  };
}
