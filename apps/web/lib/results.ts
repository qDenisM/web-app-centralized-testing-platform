export function getResultsUrl(): string {
  return process.env.RESULTS_URL?.replace(/\/$/, "") || "http://localhost:3005";
}

export type CtResultStatus = "missing" | "draft" | "absent" | "published";

export type CtResult = {
  id: string;
  examId: string;
  userId: string;
  score: number | null;
  status: CtResultStatus;
  enteredBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CtResultCounts = {
  all: number;
  missing: number;
  draft: number;
  absent: number;
  published: number;
};

export type ExaminerResultsResponse = {
  items: CtResult[];
  counts: CtResultCounts;
};

export type ExaminerSyncResponse = {
  created: number;
  items: CtResult[];
};

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

export function shortUserId(userId: string): string {
  if (!userId) return "—";
  return userId.length > 8 ? `${userId.slice(0, 8)}…` : userId;
}