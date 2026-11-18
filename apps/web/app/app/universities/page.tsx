import dynamic from "next/dynamic";
import { PageLoading } from "@/components/ui/PageLoading";
import {
  fetchCatalogSpecialties,
  fetchCatalogSubjects,
  type CatalogSpecialty,
  type CatalogSubject,
} from "@/lib/catalog";

const UniversitiesCatalog = dynamic(
  () =>
    import("@/components/universities/UniversitiesCatalog").then((m) => ({
      default: m.UniversitiesCatalog,
    })),
  { loading: () => <PageLoading label="Загрузка каталога…" /> },
);

export default async function UniversitiesPage() {
  let specialties: CatalogSpecialty[] = [];
  let subjects: CatalogSubject[] = [];
  let error: string | null = null;

  try {
    [specialties, subjects] = await Promise.all([
      fetchCatalogSpecialties(),
      fetchCatalogSubjects(),
    ]);
  } catch {
    error = "Каталог временно недоступен. Проверьте, что catalog-service запущен.";
  }

  if (error) {
    return (
      <div className="rounded-[14px] border border-border bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="text-xl font-extrabold text-brand-900">
          Подбор специальностей по баллам
        </h1>
        <p className="mt-2 text-sm text-text-secondary">{error}</p>
      </div>
    );
  }

  return (
    <UniversitiesCatalog specialties={specialties} subjects={subjects} />
  );
}
