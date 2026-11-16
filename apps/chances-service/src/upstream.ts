import { AppError } from "@abiturent/service-kit";
import { config } from "./config.js";
import type { CatalogSpecialty, CtResultRow } from "./calculate.js";

type ApplicantProfile = {
  attestatAverage: number | null;
};

type ExamRow = {
  id: string;
  subjectId: string;
};

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new AppError(500, "INTERNAL_ERROR", "Пустой ответ upstream");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AppError(500, "INTERNAL_ERROR", "Некорректный JSON upstream");
  }
}

export async function fetchCatalogSpecialties(): Promise<CatalogSpecialty[]> {
  const res = await fetch(`${config.catalogUrl}/specialties`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new AppError(502, "INTERNAL_ERROR", "catalog-service недоступен");
  }
  return readJson<CatalogSpecialty[]>(res);
}

export async function fetchApplicantProfile(
  authorization: string,
): Promise<ApplicantProfile> {
  const res = await fetch(`${config.applicantUrl}/profile/me`, {
    headers: {
      Accept: "application/json",
      Authorization: authorization,
    },
  });
  if (res.status === 401 || res.status === 403) {
    throw AppError.unauthorized();
  }
  if (!res.ok) {
    throw new AppError(502, "INTERNAL_ERROR", "applicant-service недоступен");
  }
  return readJson<ApplicantProfile>(res);
}

export async function fetchPublishedResults(
  authorization: string,
): Promise<CtResultRow[]> {
  const res = await fetch(`${config.resultsUrl}/results/me`, {
    headers: {
      Accept: "application/json",
      Authorization: authorization,
    },
  });
  if (res.status === 401 || res.status === 403) {
    throw AppError.unauthorized();
  }
  if (!res.ok) {
    throw new AppError(502, "INTERNAL_ERROR", "results-service недоступен");
  }
  return readJson<CtResultRow[]>(res);
}

export async function fetchExamSubjectMap(): Promise<Map<string, string>> {
  const res = await fetch(`${config.examUrl}/exams`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new AppError(502, "INTERNAL_ERROR", "exam-service недоступен");
  }
  const rows = await readJson<ExamRow[]>(res);
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.id, row.subjectId);
  }
  return map;
}