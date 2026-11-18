import dynamic from "next/dynamic";
import { PageLoading } from "@/components/ui/PageLoading";
import { fetchCatalogSubjects } from "@/lib/catalog";

const ResultsRegister = dynamic(
  () =>
    import("@/components/examiner/ResultsRegister").then((m) => ({
      default: m.ResultsRegister,
    })),
  { loading: () => <PageLoading label="Загрузка журнала…" /> },
);

export default async function ExaminerHomePage() {
  let subjects: Awaited<ReturnType<typeof fetchCatalogSubjects>> = [];
  try {
    subjects = await fetchCatalogSubjects();
  } catch {
    subjects = [];
  }
  return <ResultsRegister subjects={subjects} />;
}
