import { AppError } from "@abiturent/service-kit";
import { config } from "./config.js";
import { prisma } from "./db.js";

export type ExamMeta = {
  subjectId: string;
  campaignYear: number;
};

/** Meaningful = published, or any non-absent row that already has a score. */
export function isMeaningfulResult(row: {
  status: string;
  score: number | null;
}): boolean {
  if (row.status === "absent") return false;
  if (row.status === "published") return true;
  return row.score != null;
}

export async function fetchExamMeta(examId: string): Promise<ExamMeta | null> {
  try {
    const res = await fetch(`${config.examUrl}/exams/${examId}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      subjectId?: string;
      startsAt?: string;
    };
    if (!data.subjectId || !data.startsAt) return null;
    const year = new Date(data.startsAt).getFullYear();
    if (!Number.isFinite(year)) return null;
    return { subjectId: data.subjectId, campaignYear: year };
  } catch {
    return null;
  }
}

export async function resolveExamMeta(input: {
  examId: string;
  subjectId?: string | null;
  campaignYear?: number | null;
}): Promise<ExamMeta | null> {
  if (input.subjectId && input.campaignYear != null) {
    return {
      subjectId: input.subjectId,
      campaignYear: input.campaignYear,
    };
  }
  return fetchExamMeta(input.examId);
}

/** Create a missing CT result row for an approved applicant (idempotent). */
export async function ensureResultRow(input: {
  examId: string;
  userId: string;
  subjectId?: string | null;
  campaignYear?: number | null;
}): Promise<{ created: boolean }> {
  const meta = await resolveExamMeta(input);

  const existing = await prisma.ctResult.findUnique({
    where: {
      examId_userId: { examId: input.examId, userId: input.userId },
    },
  });
  if (existing) {
    if (
      meta &&
      (!existing.subjectId ||
        existing.campaignYear == null ||
        existing.subjectId !== meta.subjectId ||
        existing.campaignYear !== meta.campaignYear)
    ) {
      await prisma.ctResult.update({
        where: { id: existing.id },
        data: {
          subjectId: meta.subjectId,
          campaignYear: meta.campaignYear,
        },
      });
    }
    return { created: false };
  }

  await prisma.ctResult.create({
    data: {
      examId: input.examId,
      userId: input.userId,
      subjectId: meta?.subjectId ?? null,
      campaignYear: meta?.campaignYear ?? null,
      status: "missing",
      score: null,
    },
  });
  return { created: true };
}

/**
 * Hide scores from the competitive total when admission is revoked.
 * Published → draft (score kept for examiner after possible re-approve).
 */
export async function retractPublishedResult(input: {
  examId: string;
  userId: string;
}): Promise<{ retracted: boolean }> {
  const existing = await prisma.ctResult.findUnique({
    where: {
      examId_userId: { examId: input.examId, userId: input.userId },
    },
  });
  if (!existing || existing.status !== "published") {
    return { retracted: false };
  }

  await prisma.ctResult.update({
    where: { id: existing.id },
    data: {
      status: "draft",
      publishedAt: null,
    },
  });
  return { retracted: true };
}

export async function assertCanPublish(row: {
  id: string;
  userId: string;
  examId: string;
  subjectId: string | null;
  campaignYear: number | null;
  score: number | null;
  status: string;
}): Promise<{ subjectId: string; campaignYear: number }> {
  if (row.status === "absent") {
    throw AppError.badRequest("Неявку публиковать не нужно");
  }
  if (row.score === null || row.score === undefined) {
    throw AppError.badRequest("Сначала укажите балл");
  }

  let subjectId = row.subjectId;
  let campaignYear = row.campaignYear;
  if (!subjectId || campaignYear == null) {
    const meta = await fetchExamMeta(row.examId);
    if (!meta) {
      throw AppError.badRequest(
        "Не удалось определить предмет и год кампании для результата",
      );
    }
    subjectId = meta.subjectId;
    campaignYear = meta.campaignYear;
    await prisma.ctResult.update({
      where: { id: row.id },
      data: { subjectId, campaignYear },
    });
  }

  const duplicate = await prisma.ctResult.findFirst({
    where: {
      userId: row.userId,
      subjectId,
      campaignYear,
      status: "published",
      id: { not: row.id },
    },
  });
  if (duplicate) {
    throw AppError.conflict(
      "Опубликованный результат по этому предмету за кампанию уже есть",
    );
  }

  return { subjectId, campaignYear };
}

export async function findMeaningfulResult(input: {
  userId: string;
  subjectId: string;
  campaignYear: number;
}): Promise<{ exists: boolean; resultId: string | null }> {
  const rows = await prisma.ctResult.findMany({
    where: {
      userId: input.userId,
      subjectId: input.subjectId,
      campaignYear: input.campaignYear,
    },
  });

  // Also catch legacy rows without subject/year: match via exam-service.
  if (rows.length === 0) {
    const legacy = await prisma.ctResult.findMany({
      where: {
        userId: input.userId,
        OR: [{ subjectId: null }, { campaignYear: null }],
      },
    });
    for (const row of legacy) {
      const meta = await fetchExamMeta(row.examId);
      if (
        meta &&
        meta.subjectId === input.subjectId &&
        meta.campaignYear === input.campaignYear
      ) {
        await prisma.ctResult.update({
          where: { id: row.id },
          data: {
            subjectId: meta.subjectId,
            campaignYear: meta.campaignYear,
          },
        });
        if (isMeaningfulResult(row)) {
          return { exists: true, resultId: row.id };
        }
      }
    }
    return { exists: false, resultId: null };
  }

  const hit = rows.find(isMeaningfulResult);
  return { exists: Boolean(hit), resultId: hit?.id ?? null };
}
