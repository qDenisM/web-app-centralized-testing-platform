import type { CtResult } from "../generated/prisma/index.js";

export function resultJson(row: CtResult) {
  return {
    id: row.id,
    examId: row.examId,
    userId: row.userId,
    subjectId: row.subjectId,
    campaignYear: row.campaignYear,
    score: row.score,
    status: row.status,
    enteredBy: row.enteredBy,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function resultStatusLabel(status: string): string {
  switch (status) {
    case "missing":
      return "Не внесён";
    case "draft":
      return "Черновик";
    case "absent":
      return "Неявка";
    case "published":
      return "Опубликован";
    default:
      return status;
  }
}
