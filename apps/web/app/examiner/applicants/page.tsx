import { ExaminerApplicants } from "@/components/examiner/ExaminerApplicants";
import { fetchCatalogSubjects } from "@/lib/catalog";

export default async function ExaminerApplicantsPage() {
  let subjects: Awaited<ReturnType<typeof fetchCatalogSubjects>> = [];
  try {
    subjects = await fetchCatalogSubjects();
  } catch {
    subjects = [];
  }
  return <ExaminerApplicants subjects={subjects} />;
}
