import { ExaminerExams } from "@/components/examiner/ExaminerExams";
import { fetchCatalogSubjects } from "@/lib/catalog";

export default async function ExaminerExamsPage() {
  let subjects: Awaited<ReturnType<typeof fetchCatalogSubjects>> = [];
  try {
    subjects = await fetchCatalogSubjects();
  } catch {
    subjects = [];
  }
  return <ExaminerExams subjects={subjects} />;
}