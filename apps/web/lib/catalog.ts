export function getCatalogUrl(): string {
  return process.env.CATALOG_URL?.replace(/\/$/, "") || "http://localhost:3002";
}

export type CatalogInstitution = {
  id: string;
  type: string;
  shortName: string;
  fullName: string;
  address: string | null;
  city: string | null;
  website?: string | null;
  isPublished: boolean;
};

export type CatalogSubject = {
  id: string;
  name: string;
  shortCode: string;
  status: string;
};

export type CatalogSpecialtySubject = {
  id: string;
  specialtyId: string;
  subjectId: string;
  slot: number;
  minScore: number;
  subject?: CatalogSubject;
};

export type CatalogPassingScore = {
  id: string;
  specialtyId: string;
  year: number;
  score: number;
  competition: number | null;
};

export type CatalogSpecialty = {
  id: string;
  institutionId: string;
  okrbCode: string;
  name: string;
  studyForm: string;
  funding: string;
  placesPlan: number;
  contentMode: string;
  isPublished: boolean;
  institution?: CatalogInstitution;
  subjects?: CatalogSpecialtySubject[];
  passingScores?: CatalogPassingScore[];
};

export function fundingLabel(value: string): string {
  if (value === "budget") return "Бюджет";
  if (value === "paid") return "Платное";
  return value;
}

export function studyFormLabel(value: string): string {
  if (value === "fulltime") return "Очное";
  if (value === "parttime") return "Заочное";
  if (value === "distance") return "Дистанционное";
  return value;
}

export function institutionTypeLabel(value: string): string {
  if (value === "university") return "ВУЗ";
  if (value === "college") return "Колледж";
  return value;
}

export function latestPassingScore(
  scores: CatalogPassingScore[] | undefined,
): CatalogPassingScore | null {
  if (!scores || scores.length === 0) return null;
  return [...scores].sort((a, b) => b.year - a.year)[0] ?? null;
}

export async function fetchCatalogSpecialties(): Promise<CatalogSpecialty[]> {
  const res = await fetch(`${getCatalogUrl()}/specialties`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Не удалось загрузить специальности");
  }
  return (await res.json()) as CatalogSpecialty[];
}

export async function fetchCatalogSubjects(): Promise<CatalogSubject[]> {
  const res = await fetch(`${getCatalogUrl()}/subjects`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Не удалось загрузить предметы");
  }
  return (await res.json()) as CatalogSubject[];
}
