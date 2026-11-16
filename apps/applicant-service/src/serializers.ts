import type {
  ApplicantProfile,
  Verification,
} from "../generated/prisma/index.js";

export function profileJson(
  row: ApplicantProfile & { verifications?: Verification[] },
) {
  const latest = row.verifications?.[0];
  return {
    id: row.id,
    userId: row.userId,
    birthDate: row.birthDate
      ? row.birthDate.toISOString().slice(0, 10)
      : null,
    passportSeries: row.passportSeries,
    passportNumber: row.passportNumber,
    storageKey: row.storageKey,
    hasAttestatScan: Boolean(row.storageKey),
    attestatAverage: row.attestatAverage,
    schoolName: row.schoolName,
    graduateName: row.graduateName,
    attestatIssuedOn: row.attestatIssuedOn
      ? row.attestatIssuedOn.toISOString().slice(0, 10)
      : null,
    createdAt: row.createdAt.toISOString(),
    verification: latest
      ? {
          id: latest.id,
          version: latest.version,
          status: latest.status,
          rejectReason: latest.rejectReason,
          submittedAt: latest.submittedAt?.toISOString() ?? null,
          decidedAt: latest.decidedAt?.toISOString() ?? null,
        }
      : null,
  };
}
