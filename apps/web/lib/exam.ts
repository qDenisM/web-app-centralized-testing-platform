export function getExamUrl(): string {
  return process.env.EXAM_URL?.replace(/\/$/, "") || "http://localhost:3004";
}

export type ExamVenue = {
  id: string;
  name: string;
  address: string;
  city: string;
};

export type ExamSession = {
  id: string;
  subjectId: string;
  venueId: string;
  startsAt: string;
  duration: number;
  capacity: number;
  seatsTaken: number;
  seatsLeft: number;
  isReserve: boolean;
  venue?: ExamVenue;
};

export type ExamApplicantBrief = {
  fullName: string | null;
  email: string | null;
  graduateName: string | null;
  attestatAverage: number | null;
};

export type ExamApplication = {
  id: string;
  examId: string;
  userId: string;
  status: string;
  passNumber: string | null;
  passStorageKey: string | null;
  hasPass: boolean;
  rejectReason: string | null;
  createdAt: string;
  exam?: ExamSession;
  /** Present on examiner applications responses (identity + profile enrichment). */
  applicant?: ExamApplicantBrief;
};

export type ExamWaitlistEntry = {
  id: string;
  examId: string;
  userId: string;
  position: number;
  status: string;
  offerExpiresAt: string | null;
  exam?: ExamSession;
};

export function applicationStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "На модерации";
    case "approved":
      return "Вы записаны";
    case "rejected":
      return "Отклонено";
    case "cancelled":
      return "Отменено";
    default:
      return status;
  }
}

export function formatExamWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Mockup style: «12 июня 2026, 10:00» */
export function formatExamWhenShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day}, ${time}`;
}

export function formatExamVenue(exam: Pick<ExamSession, "venue">): string {
  const name = exam.venue?.name?.trim();
  const address = exam.venue?.address?.trim();
  if (name && address && !name.includes(address)) {
    return `${name}, ${address}`;
  }
  return name || address || "Пункт не указан";
}
