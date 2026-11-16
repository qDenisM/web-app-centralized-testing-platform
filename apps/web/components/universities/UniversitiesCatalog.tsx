"use client";

import { useMemo, useState } from "react";
import {
  fundingLabel,
  institutionTypeLabel,
  latestPassingScore,
  studyFormLabel,
  type CatalogSpecialty,
  type CatalogSubject,
} from "@/lib/catalog";

type UniversitiesCatalogProps = {
  specialties: CatalogSpecialty[];
  subjects: CatalogSubject[];
};

type SortMode = "score-desc" | "score-asc" | "name";

const emptyFilters = {
  university: "",
  specialty: "",
  city: "",
  funding: "",
  studyForm: "",
  type: "",
  subjectIds: [] as string[],
};

export function UniversitiesCatalog({
  specialties,
  subjects,
}: UniversitiesCatalogProps) {
  const [filters, setFilters] = useState(emptyFilters);
  const [sort, setSort] = useState<SortMode>("score-desc");

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const item of specialties) {
      if (item.institution?.city) set.add(item.institution.city);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [specialties]);

  const filtered = useMemo(() => {
    const universityQ = filters.university.trim().toLowerCase();
    const specialtyQ = filters.specialty.trim().toLowerCase();

    let rows = specialties.filter((item) => {
      const institution = item.institution;
      if (!institution) return false;

      if (universityQ) {
        const hay = `${institution.shortName} ${institution.fullName}`.toLowerCase();
        if (!hay.includes(universityQ)) return false;
      }

      if (specialtyQ) {
        const hay = `${item.name} ${item.okrbCode}`.toLowerCase();
        if (!hay.includes(specialtyQ)) return false;
      }

      if (filters.city && institution.city !== filters.city) return false;
      if (filters.funding && item.funding !== filters.funding) return false;
      if (filters.studyForm && item.studyForm !== filters.studyForm) return false;
      if (filters.type && institution.type !== filters.type) return false;

      if (filters.subjectIds.length > 0) {
        const ids = new Set((item.subjects || []).map((s) => s.subjectId));
        for (const id of filters.subjectIds) {
          if (!ids.has(id)) return false;
        }
      }

      return true;
    });

    rows = [...rows].sort((a, b) => {
      if (sort === "name") {
        return a.name.localeCompare(b.name, "ru");
      }
      const scoreA = latestPassingScore(a.passingScores)?.score ?? -1;
      const scoreB = latestPassingScore(b.passingScores)?.score ?? -1;
      return sort === "score-desc" ? scoreB - scoreA : scoreA - scoreB;
    });

    return rows;
  }, [filters, sort, specialties]);

  function toggleSubject(id: string) {
    setFilters((prev) => {
      const has = prev.subjectIds.includes(id);
      return {
        ...prev,
        subjectIds: has
          ? prev.subjectIds.filter((x) => x !== id)
          : [...prev.subjectIds, id],
      };
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Каталог специальностей
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Подбор вузов и колледжей по фильтрам. Оценка шансов появится позже.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <section className="h-fit rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wide text-brand-900">
              Фильтры подбора
            </h2>
            <button
              type="button"
              className="text-xs font-semibold text-brand-700 hover:underline"
              onClick={() => setFilters(emptyFilters)}
            >
              Сбросить
            </button>
          </div>

          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-text-secondary">
                ВУЗ / СПО
              </span>
              <input
                value={filters.university}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, university: e.target.value }))
                }
                placeholder="БГУ, БГУИР..."
                className="w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-text-secondary">
                Специальность
              </span>
              <input
                value={filters.specialty}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, specialty: e.target.value }))
                }
                placeholder="Информатика, ПОИТ..."
                className="w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-sm font-semibold text-text-secondary">
                Предметы ЦТ
              </span>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-[10px] border border-border p-2">
                {subjects.map((subject) => {
                  const checked = filters.subjectIds.includes(subject.id);
                  return (
                    <label
                      key={subject.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm text-text-secondary hover:bg-[#f4f7f9]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSubject(subject.id)}
                        className="accent-brand-700"
                      />
                      {subject.name}
                    </label>
                  );
                })}
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-text-secondary">
                Город
              </span>
              <select
                value={filters.city}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, city: e.target.value }))
                }
                className="w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">Все города</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="space-y-1.5">
              <legend className="text-sm font-semibold text-text-secondary">
                Основа обучения
              </legend>
              <div className="flex flex-wrap gap-3 text-sm text-text-secondary">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="funding"
                    checked={filters.funding === ""}
                    onChange={() =>
                      setFilters((prev) => ({ ...prev, funding: "" }))
                    }
                    className="accent-brand-700"
                  />
                  Любая
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="funding"
                    checked={filters.funding === "budget"}
                    onChange={() =>
                      setFilters((prev) => ({ ...prev, funding: "budget" }))
                    }
                    className="accent-brand-700"
                  />
                  Бюджет
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="funding"
                    checked={filters.funding === "paid"}
                    onChange={() =>
                      setFilters((prev) => ({ ...prev, funding: "paid" }))
                    }
                    className="accent-brand-700"
                  />
                  Платное
                </label>
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-text-secondary">
                  Формат
                </span>
                <select
                  value={filters.studyForm}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      studyForm: e.target.value,
                    }))
                  }
                  className="w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">Любой</option>
                  <option value="fulltime">Очное</option>
                  <option value="parttime">Заочное</option>
                  <option value="distance">Дистанционное</option>
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-text-secondary">
                  Тип
                </span>
                <select
                  value={filters.type}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">Любой</option>
                  <option value="university">ВУЗ</option>
                  <option value="college">Колледж</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-text-secondary">
              Найдено {filtered.length}{" "}
              {filtered.length === 1
                ? "специальность"
                : filtered.length >= 2 && filtered.length <= 4
                  ? "специальности"
                  : "специальностей"}
            </p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="rounded-[10px] border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="score-desc">По проходному баллу (убывание)</option>
              <option value="score-asc">По проходному баллу (возрастание)</option>
              <option value="name">По названию</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-[14px] border border-border bg-white p-8 text-center text-sm text-text-muted">
              Ничего не найдено. Измените фильтры.
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((item) => {
                const institution = item.institution!;
                const passing = latestPassingScore(item.passingScores);
                const subjectNames = (item.subjects || [])
                  .map((s) => s.subject?.name)
                  .filter(Boolean)
                  .join(", ");

                return (
                  <li
                    key={item.id}
                    className="rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-extrabold text-brand-900">
                          {institution.shortName} — {institution.fullName}
                        </h3>
                        <p className="mt-1 text-sm text-text-secondary">
                          Специальность: {item.name}
                        </p>
                        <p className="text-xs text-text-muted">
                          Код ОКРБ: {item.okrbCode} ·{" "}
                          {institutionTypeLabel(institution.type)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <div>
                        <div className="text-xs text-text-muted">Город</div>
                        <div className="font-semibold text-text-primary">
                          {institution.city || "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-text-muted">
                          Проходной{passing ? ` ${passing.year}` : ""}
                        </div>
                        <div className="font-semibold text-text-primary">
                          {passing ? passing.score : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-text-muted">
                          Основа / формат
                        </div>
                        <div className="font-semibold text-text-primary">
                          {fundingLabel(item.funding)} /{" "}
                          {studyFormLabel(item.studyForm)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-text-muted">План набора</div>
                        <div className="font-semibold text-text-primary">
                          {item.placesPlan}
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-text-secondary">
                      Предметы ЦТ: {subjectNames || "не указаны"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled
                        className="rounded-[10px] border border-border px-3.5 py-2 text-sm font-semibold text-text-muted"
                        title="Избранное будет на следующем этапе"
                      >
                        В избранное
                      </button>
                      <details className="rounded-[10px] border border-border">
                        <summary className="cursor-pointer list-none px-3.5 py-2 text-sm font-semibold text-brand-800">
                          Подробнее
                        </summary>
                        <div className="border-t border-border px-3.5 py-3 text-sm text-text-secondary">
                          <p>Адрес: {institution.address || "не указан"}</p>
                          {passing?.competition != null ? (
                            <p className="mt-1">
                              Конкурс {passing.year}: {passing.competition}
                            </p>
                          ) : null}
                          {(item.passingScores || []).length > 1 ? (
                            <p className="mt-1">
                              История проходных:{" "}
                              {(item.passingScores || [])
                                .map((p) => `${p.year} — ${p.score}`)
                                .join("; ")}
                            </p>
                          ) : null}
                        </div>
                      </details>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
