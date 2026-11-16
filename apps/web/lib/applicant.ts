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
    submittedAt: string | null;
    decidedAt: string | null;
  } | null;
};

export type UploadUrlResponse = {
  uploadUrl: string;
  storageKey: string;
  expiresIn: number;
};
