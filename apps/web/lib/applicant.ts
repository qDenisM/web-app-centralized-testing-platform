export function getApplicantUrl(): string {
  return (
    process.env.APPLICANT_URL?.replace(/\/$/, "") || "http://localhost:3003"
  );
}

export type VerificationMeta = {
  id: string;
  version: number;
  status: string;
  rejectReason: string | null;
  lockedBy: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
};

export type ApplicantProfile = {
  id: string;
  userId: string;
  birthDate: string | null;
  passportSeries: string | null;
  passportNumber: string | null;
  storageKey: string | null;
  hasAttestatScan: boolean;
  attestatAverage: number | null;
  schoolName: string | null;
  graduateName: string | null;
  attestatIssuedOn: string | null;
  /** Published CT result IDs that count toward competitive score (max 3). Empty = default top 3. */
  selectedCtResultIds: string[];
  createdAt: string;
  verification: VerificationMeta | null;
};

export type VerificationHistoryItem = VerificationMeta;

export type VerificationHistoryList = {
  items: VerificationHistoryItem[];
};

export type VerificationDetail = VerificationMeta & {
  profile: {
    birthDate: string | null;
    passportSeries: string | null;
    passportNumber: string | null;
    hasAttestatScan: boolean;
    attestatAverage: number | null;
    schoolName: string | null;
    graduateName: string | null;
    attestatIssuedOn: string | null;
  };
};

export type UploadUrlResponse = {
  uploadUrl: string;
  storageKey: string;
  expiresIn: number;
};

export type OcrAttestatResponse = {
  graduateName: string;
  schoolName: string;
  attestatAverage: number | null;
  attestatIssuedOn: string;
  lowConfidenceFields: string[];
  /** True when ai-service returned a demo stub (file was not actually read). */
  stub?: boolean;
  /** Human-readable reason when stub/fallback was used. */
  error?: string | null;
};

export function verificationStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "draft":
      return "черновик";
    case "pending":
      return "на проверке";
    case "approved":
      return "подтверждено";
    case "rejected":
      return "отказано";
    case "returned":
      return "возвращено на доработку";
    default:
      return status || "нет статуса";
  }
}

export function verificationStatusBadgeClass(
  status: string | null | undefined,
): string {
  switch (status) {
    case "draft":
      return "bg-[#eef2f5] text-text-secondary";
    case "pending":
      return "bg-brand-100 text-brand-900";
    case "approved":
      return "bg-green-50 text-green-800";
    case "rejected":
      return "bg-red-50 text-red-700";
    case "returned":
      return "bg-[#FFF4D6] text-[#9A6B00]";
    default:
      return "bg-[#eef2f5] text-text-muted";
  }
}

export function formatVerificationDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function verificationVersionLabel(version: number): string {
  if (version > 1) return `${version}-я отправка`;
  return `${version}-я отправка`;
}
