export type ModeratorVerificationItem = {
  id: string;
  profileId: string;
  version: number;
  status: string;
  rejectReason: string | null;
  lockedBy: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  /** Short-lived MinIO signed GET URL; present on verification detail only. */
  attestatScanUrl?: string | null;
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

export function isAttestatPdf(storageKey: string | null | undefined): boolean {
  if (!storageKey) return false;
  return /\.pdf$/i.test(storageKey);
}

export function isAttestatImage(storageKey: string | null | undefined): boolean {
  if (!storageKey) return false;
  return /\.(jpe?g|png|webp)$/i.test(storageKey);
}

export type ModeratorQueueResponse = {
  items: ModeratorVerificationItem[];
  counts: {
    all: number;
    pending: number;
    returned: number;
    rejected: number;
  };
};

/** Soft daily quota for overview «норматив» (UI only). */
export const MODERATOR_DAILY_QUOTA = 40;

export function waitingLabel(submittedAt: string | null): string {
  if (!submittedAt) return "—";
  const ms = Date.now() - new Date(submittedAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return "—";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours <= 0) return `${mins} мин.`;
  return `${hours} ч.`;
}

export function waitingHours(submittedAt: string | null): number {
  if (!submittedAt) return 0;
  const ms = Date.now() - new Date(submittedAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60));
}

export function formatSubmittedAt(submittedAt: string | null): string {
  if (!submittedAt) return "—";
  const date = new Date(submittedAt);
  if (Number.isNaN(date.getTime())) return "—";

  const time = date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) return `Сегодня, ${time}`;
  if (date >= startOfYesterday) return `Вчера, ${time}`;

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function versionLabelInline(version: number): string {
  if (version > 1) return `${version}-я отправка (после исправления)`;
  return `${version}-я отправка`;
}

export function isResubmission(item: ModeratorVerificationItem): boolean {
  return item.version > 1;
}

export function isSameCalendarDay(iso: string | null, ref = new Date()): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === ref.getFullYear() &&
    date.getMonth() === ref.getMonth() &&
    date.getDate() === ref.getDate()
  );
}

export function moderatorStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "На проверке";
    case "returned":
      return "На исправление";
    case "rejected":
      return "Отказано";
    case "approved":
      return "Подтверждено";
    default:
      return status;
  }
}

export function applicantDisplayName(item: ModeratorVerificationItem): string {
  return (
    item.profile.graduateName ||
    `Абитуриент ${item.profile.userId.slice(0, 8)}`
  );
}

export function passportDisplay(item: ModeratorVerificationItem): string | null {
  if (item.profile.passportSeries && item.profile.passportNumber) {
    return `${item.profile.passportSeries} ${item.profile.passportNumber}`;
  }
  return null;
}
