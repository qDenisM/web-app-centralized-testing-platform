import { ExaminerExamStatement } from "@/components/examiner/ExaminerExamStatement";
import { fetchCatalogSubjects } from "@/lib/catalog";

type PageProps = {
  params: Promise<{ examId: string }>;
};

export default async function ExaminerExamStatementPage({ params }: PageProps) {
  const { examId } = await params;
  let subjects: Awaited<ReturnType<typeof fetchCatalogSubjects>> = [];
  try {
    subjects = await fetchCatalogSubjects();
  } catch {
    subjects = [];
  }
  return <ExaminerExamStatement examId={examId} subjects={subjects} />;
}
