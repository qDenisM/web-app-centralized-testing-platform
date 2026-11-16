import { CtCabinet } from "@/components/ct/CtCabinet";
import {
  fetchCatalogSubjects,
  type CatalogSubject,
} from "@/lib/catalog";

export default async function CtPage() {
  let subjects: CatalogSubject[] = [];
  let error: string | null = null;

  try {
    subjects = await fetchCatalogSubjects();
  } catch {
    error = "Не удалось загрузить предметы. Проверьте catalog-service.";
  }

  if (error) {
    return (
      <div className="rounded-[14px] border border-border bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="text-xl font-extrabold text-brand-900">Мои ЦТ</h1>
        <p className="mt-2 text-sm text-text-secondary">{error}</p>
      </div>
    );
  }

  return <CtCabinet subjects={subjects} />;
}
