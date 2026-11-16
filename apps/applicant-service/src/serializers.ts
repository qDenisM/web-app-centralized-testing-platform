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
          lockedBy: latest.lockedBy,
          submittedAt: latest.submittedAt?.toISOString() ?? null,
          decidedAt: latest.decidedAt?.toISOString() ?? null,
        }
      : null,
  };
}

export function verificationQueueJson(
  row: Verification & { profile: ApplicantProfile },
) {
  return {
    id: row.id,
    profileId: row.profileId,
    version: row.version,
    status: row.status,
    rejectReason: row.rejectReason,
    lockedBy: row.lockedBy,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    profile: {
      id: row.profile.id,
      userId: row.profile.userId,
      birthDate: row.profile.birthDate
        ? row.profile.birthDate.toISOString().slice(0, 10)
        : null,
      passportSeries: row.profile.passportSeries,
      passportNumber: row.profile.passportNumber,
      hasAttestatScan: Boolean(row.profile.storageKey),
      storageKey: row.profile.storageKey,
      attestatAverage: row.profile.attestatAverage,
      schoolName: row.profile.schoolName,
      graduateName: row.profile.graduateName,
      attestatIssuedOn: row.profile.attestatIssuedOn
        ? row.profile.attestatIssuedOn.toISOString().slice(0, 10)
        : null,
    },
  };
}
