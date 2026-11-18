export type ChanceStatus = "green" | "yellow" | "red";

export type CatalogSpecialtySubject = {
  subjectId: string;
  slot: number;
};

export type CatalogPassingScore = {
  year: number;
  score: number;
  competition?: number | null;
};

export type CatalogSpecialty = {
  id: string;
  subjects?: CatalogSpecialtySubject[];
  passingScores?: CatalogPassingScore[];
};

export type CtResultRow = {
  id?: string;
  examId: string;
  score: number | null;
  status: string;
  subjectId?: string | null;
};

export const MAX_CT_RESULTS_FOR_SCORE = 3;

/** Apply applicant selection / default top-N before mapping by subject. */
export function filterResultsForChances(
  results: CtResultRow[],
  selectedIds: string[] | null | undefined,
  max = MAX_CT_RESULTS_FOR_SCORE,
): CtResultRow[] {
  const published = results.filter(
    (row) => row.status === "published" && row.score != null,
  );
  if (selectedIds && selectedIds.length > 0) {
    const set = new Set(selectedIds);
    return published.filter((row) => row.id && set.has(row.id)).slice(0, max);
  }
  return [...published]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, max);
}

export type CalcInput = {
  specialty: CatalogSpecialty;
  attestatAverage: number | null;
  scoresBySubject: Map<string, number>;
};

/** Average counts in chances only after moderator approval. */
export function contestAttestatAverage(profile: {
  attestatAverage: number | null;
  verification?: { status: string } | null;
}): number | null {
  const status = profile.verification?.status;
  if (status !== "approved" && status !== "verified") return null;
  return profile.attestatAverage;
}

export type CalcOutput = {
  status: ChanceStatus;
  /** Admission probability in percent, 0–100. */
  probability: number | null;
  scoreGap: number | null;
};

const MONTE_CARLO_SAMPLES = 8000;

function latestPassing(
  scores: CatalogPassingScore[] | undefined,
): CatalogPassingScore | null {
  if (!scores || scores.length === 0) return null;
  const sorted = [...scores].sort((a, b) => b.year - a.year);
  return sorted[0] ?? null;
}

/** Box–Muller standard normal sample. */
function randomNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Estimate cutoff volatility from history and competition.
 * Higher competition → wider spread of the last passing score.
 */
function estimateCutoffSigma(scores: CatalogPassingScore[]): number {
  const latest = latestPassing(scores);
  const competition = latest?.competition ?? 2;

  if (scores.length >= 2) {
    const values = scores.map((s) => s.score);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((acc, s) => acc + (s - mean) ** 2, 0) / (values.length - 1);
    const historical = Math.sqrt(variance);
    return Math.max(12, historical, 8 + competition * 5);
  }

  return Math.max(12, 8 + competition * 5);
}

/**
 * Monte-Carlo: sample last-year cutoff ~ Normal(passing, σ),
 * probability = share of draws where contestScore >= cutoff.
 */
export function estimateAdmissionProbability(
  contestScore: number,
  passingScores: CatalogPassingScore[],
): number {
  const latest = latestPassing(passingScores);
  if (!latest) return 0;

  const sigma = estimateCutoffSigma(passingScores);
  let wins = 0;

  for (let i = 0; i < MONTE_CARLO_SAMPLES; i++) {
    const cutoff = latest.score + randomNormal() * sigma;
    if (contestScore >= cutoff) wins += 1;
  }

  return Math.round((wins / MONTE_CARLO_SAMPLES) * 100);
}

export function evaluateChance(input: CalcInput): CalcOutput {
  const required = input.specialty.subjects ?? [];
  const passingRow = latestPassing(input.specialty.passingScores);
  const passing = passingRow?.score ?? null;

  if (
    input.attestatAverage == null ||
    passing == null ||
    required.length === 0
  ) {
    // Incomplete data → treat as 0% chance (not "unknown").
    return { status: "red", probability: 0, scoreGap: null };
  }

  let ctSum = 0;
  for (const slot of required) {
    const score = input.scoresBySubject.get(slot.subjectId);
    if (score == null) {
      // Missing a required CT subject — cannot compute contest score.
      return { status: "red", probability: 0, scoreGap: null };
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

  const probability = estimateAdmissionProbability(
    contestScore,
    input.specialty.passingScores ?? [],
  );

  return {
    status,
    probability,
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
