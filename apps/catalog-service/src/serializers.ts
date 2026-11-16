import type {
  Campaign,
  CampaignStage,
  Institution,
  PassingScore,
  Specialty,
  SpecialtySubject,
  Subject,
} from "../generated/prisma/index.js";

export function institutionJson(row: Institution) {
  return {
    id: row.id,
    type: row.type,
    shortName: row.shortName,
    fullName: row.fullName,
    address: row.address,
    city: row.city,
    isPublished: row.isPublished,
  };
}

export function subjectJson(row: Subject) {
  return {
    id: row.id,
    name: row.name,
    shortCode: row.shortCode,
    status: row.status,
  };
}

export function specialtySubjectJson(
  row: SpecialtySubject & { subject?: Subject },
) {
  return {
    id: row.id,
    specialtyId: row.specialtyId,
    subjectId: row.subjectId,
    slot: row.slot,
    minScore: row.minScore,
    subject: row.subject ? subjectJson(row.subject) : undefined,
  };
}

export function passingScoreJson(row: PassingScore) {
  return {
    id: row.id,
    specialtyId: row.specialtyId,
    year: row.year,
    score: row.score,
    competition: row.competition,
  };
}

export function specialtyJson(
  row: Specialty & {
    institution?: Institution;
    specialtySubjects?: (SpecialtySubject & { subject?: Subject })[];
    passingScores?: PassingScore[];
  },
) {
  return {
    id: row.id,
    institutionId: row.institutionId,
    okrbCode: row.okrbCode,
    name: row.name,
    studyForm: row.studyForm,
    funding: row.funding,
    placesPlan: row.placesPlan,
    contentMode: row.contentMode,
    isPublished: row.isPublished,
    institution: row.institution
      ? institutionJson(row.institution)
      : undefined,
    subjects: row.specialtySubjects?.map(specialtySubjectJson),
    passingScores: row.passingScores?.map(passingScoreJson),
  };
}

export function campaignStageJson(row: CampaignStage) {
  return {
    id: row.id,
    campaignId: row.campaignId,
    sortOrder: row.sortOrder,
    name: row.name,
    startsOn: row.startsOn.toISOString().slice(0, 10),
    endsOn: row.endsOn.toISOString().slice(0, 10),
  };
}

export function campaignJson(
  row: Campaign & { stages?: CampaignStage[] },
) {
  return {
    id: row.id,
    year: row.year,
    isActive: row.isActive,
    stages: row.stages?.map(campaignStageJson),
  };
}
