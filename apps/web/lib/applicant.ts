export function getApplicantUrl(): string {
  return (
    process.env.APPLICANT_URL?.replace(/\/$/, "") || "http://localhost:3003"
  );
}

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
  createdAt: string;
  verification: {
    id: string;
    version: number;
    status: string;
    rejectReason: string | null;
    lockedBy: string | null;
    submittedAt: string | null;
    decidedAt: string | null;
  } | null;
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
