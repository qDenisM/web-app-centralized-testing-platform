export type ModeratorVerificationItem = {
  id: string;
  profileId: string;
  version: number;
  status: string;
  rejectReason: string | null;
  lockedBy: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  profile: {
    id: string;
    userId: string;
    birthDate: string | null;
    passportSeries: string | null;
    passportNumber: string | null;
    hasAttestatScan: boolean;
    storageKey: string | null;
    attestatAverage: number | null;
    schoolName: string | null;
    graduateName: string | null;
    attestatIssuedOn: string | null;
  };
};

export type ModeratorQueueResponse = {
  items: ModeratorVerificationItem[];
  counts: {
    all: number;
    pending: number;
    returned: number;
    rejected: number;
  };
};

export function waitingLabel(submittedAt: string | null): string {
  if (!submittedAt) return "—";
  const ms = Date.now() - new Date(submittedAt).getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours <= 0) return `${mins} мин`;
  return `${hours} ч ${mins} мин`;
}

export function moderatorStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "На проверке";
    case "returned":
      return "На исправлении";
    case "rejected":
      return "Отказано";
    case "approved":
      return "Подтверждено";
    default:
      return status;
  }
}
