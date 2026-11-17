import type { ApplicantProfile } from "@/lib/applicant";
import type { CtResult } from "@/lib/results";

export type ExamSubjectRef = {
  id: string;
  subjectId: string;
};

/**
 * Competitive score = sum of best published CT scores (by subject) + attestat×10.
 * Returns null unless both attestat and at least one mapped CT score exist.
 */
export function computeCompetitiveScore(input: {
  results: CtResult[];
  profile: ApplicantProfile | null | undefined;
  exams?: ExamSubjectRef[];
}): {
  ctSum: number;
  attestatPoints: number | null;
  competitive: number | null;
  subjectScores: Array<{ subjectId: string; score: number }>;
} {
  const examById = new Map(
    (input.exams || []).map((exam) => [exam.id, exam] as const),
  );
  const requireExamMap = (input.exams?.length ?? 0) > 0;

  const best = new Map<string, { subjectId: string; score: number }>();
  for (const row of input.results) {
    if (row.status !== "published" || typeof row.score !== "number") continue;
    const exam = examById.get(row.examId);
    if (requireExamMap && !exam) continue;
    const subjectId = exam?.subjectId ?? row.examId;
    const prev = best.get(subjectId);
    if (!prev || row.score > prev.score) {
      best.set(subjectId, { subjectId, score: row.score });
    }
  }

  const subjectScores = [...best.values()];
  const ctSum = subjectScores.reduce((acc, row) => acc + row.score, 0);
  const attestat = input.profile?.attestatAverage;
  const attestatPoints =
    attestat == null ? null : Math.round(attestat * 10 * 10) / 10;

  if (attestatPoints == null || subjectScores.length === 0) {
    return { ctSum, attestatPoints, competitive: null, subjectScores };
  }

  return {
    ctSum,
    attestatPoints,
    competitive: Math.round((ctSum + attestatPoints) * 10) / 10,
    subjectScores,
  };
}
