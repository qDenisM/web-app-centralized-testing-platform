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
