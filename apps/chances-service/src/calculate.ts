export type ChanceStatus = "green" | "yellow" | "red";

export type CatalogSpecialtySubject = {
  subjectId: string;
  slot: number;
};

export type CatalogPassingScore = {
  year: number;
  score: number;
};

export type CatalogSpecialty = {
  id: string;
  subjects?: CatalogSpecialtySubject[];
  passingScores?: CatalogPassingScore[];
};

export type CtResultRow = {
  examId: string;
  score: number | null;
  status: string;
};

export type CalcInput = {
  specialty: CatalogSpecialty;
  attestatAverage: number | null;
  scoresBySubject: Map<string, number>;
};

export type CalcOutput = {
  status: ChanceStatus;
  probability: number | null;
  scoreGap: number | null;
};

function latestPassingScore(
  scores: CatalogPassingScore[] | undefined,
): number | null {
  if (!scores || scores.length === 0) return null;
  const sorted = [...scores].sort((a, b) => b.year - a.year);
  return sorted[0]?.score ?? null;
}

export function evaluateChance(input: CalcInput): CalcOutput {
  const required = input.specialty.subjects ?? [];
  const passing = latestPassingScore(input.specialty.passingScores);

  if (
    input.attestatAverage == null ||
    passing == null ||
    required.length === 0
  ) {
    return { status: "red", probability: null, scoreGap: null };
  }

  let ctSum = 0;
  for (const slot of required) {
    const score = input.scoresBySubject.get(slot.subjectId);
    if (score == null) {
      return { status: "red", probability: null, scoreGap: null };
    }
    ctSum += score;
  }

  const contestScore = Math.round(ctSum + input.attestatAverage * 10);
  const scoreGap = contestScore - passing;

  let status: ChanceStatus = "red";
  if (contestScore >= passing + 5) {
    status = "green";
  } else if (contestScore >= passing - 10) {
    status = "yellow";
  }

  return {
    status,
    probability: contestScore,
    scoreGap,
  };
}

export function buildScoresBySubject(
  results: CtResultRow[],
  examToSubject: Map<string, string>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of results) {
    if (row.status !== "published" || row.score == null) continue;
    const subjectId = examToSubject.get(row.examId);
    if (!subjectId) continue;
    const prev = map.get(subjectId);
    if (prev == null || row.score > prev) {
      map.set(subjectId, row.score);
    }
  }
  return map;
}