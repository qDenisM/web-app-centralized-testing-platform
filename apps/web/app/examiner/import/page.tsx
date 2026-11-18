import { ResultsImport } from "@/components/examiner/ResultsImport";
import { fetchCatalogSubjects } from "@/lib/catalog";

export default async function ExaminerImportPage() {
  let subjects: Awaited<ReturnType<typeof fetchCatalogSubjects>> = [];
  try {
    subjects = await fetchCatalogSubjects();
  } catch {
    subjects = [];
  }
  return <ResultsImport subjects={subjects} />;
}
