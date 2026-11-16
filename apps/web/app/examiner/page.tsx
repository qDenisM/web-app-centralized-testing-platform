import { ResultsRegister } from "@/components/examiner/ResultsRegister";
import { fetchCatalogSubjects } from "@/lib/catalog";

export default async function ExaminerHomePage() {
  let subjects: Awaited<ReturnType<typeof fetchCatalogSubjects>> = [];
  try {
    subjects = await fetchCatalogSubjects();
  } catch {
    subjects = [];
  }
  return <ResultsRegister subjects={subjects} />;
}