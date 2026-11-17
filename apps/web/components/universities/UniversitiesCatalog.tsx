"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fundingLabel,
  institutionTypeLabel,
  latestPassingScore,
  studyFormLabel,
  type CatalogSpecialty,
  type CatalogSubject,
} from "@/lib/catalog";
import type { ChanceResult, ChanceStatus, Favorite } from "@/lib/chances";
import { catalogChanceLabel } from "@/lib/chances-display";
import { cn } from "@/lib/utils";

type UniversitiesCatalogProps = {
  specialties: CatalogSpecialty[];
  subjects: CatalogSubject[];
};

type SortMode = "score-desc" | "score-asc" | "name";
type ChanceFilter = "" | "green" | "yellow" | "red" | "none";

const emptyFilters = {
  university: "",
  specialty: "",
  city: "",
  funding: "",
  studyForm: "",
  type: "",
  subjectIds: [] as string[],
  chance: "" as ChanceFilter,
};

const fieldClass =
  "w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function UniversitiesCatalog({
  specialties,
  subjects,
}: UniversitiesCatalogProps) {
  const [filters, setFilters] = useState(emptyFilters);
  const [sort, setSort] = useState<SortMode>("score-desc");
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [chances, setChances] = useState<ChanceResult[]>([]);
  const [chancesLoading, setChancesLoading] = useState(true);
  const [chancesError, setChancesError] = useState<string | null>(null);
  const [busySpecialtyId, setBusySpecialtyId] = useState<string | null>(null);
  const [calcBusy, setCalcBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((f) => f.specialtyId)),
    [favorites],
  );

  const chanceBySpecialty = useMemo(() => {
    const map = new Map<string, ChanceResult>();
    for (const row of chances) map.set(row.specialtyId, row);
    return map;
  }, [chances]);

  const loadChances = useCallback(async () => {
    setChancesLoading(true);
    setChancesError(null);
    try {
      const [favRes, chanceRes] = await Promise.all([
        fetch("/api/favorites"),
        fetch("/api/chances/me"),
      ]);
      const favJson = (await favRes.json().catch(() => [])) as
        | Favorite[]
        | { error?: string };
      const chanceJson = (await chanceRes.json().catch(() => [])) as
        | ChanceResult[]
        | { error?: string };

      if (!favRes.ok || !Array.isArray(favJson)) {
        if (favRes.status === 401) {
          setFavorites([]);
          setChances([]);
          return;
        }
        setChancesError(
          !Array.isArray(favJson) && favJson.error
            ? favJson.error
            : "Не удалось загрузить избранное",
        );
        return;
      }

      if (!chanceRes.ok || !Array.isArray(chanceJson)) {
        if (chanceRes.status === 401) {
          setFavorites(favJson);
          setChances([]);
          return;
        }
        setChancesError(
          !Array.isArray(chanceJson) && chanceJson.error
            ? chanceJson.error
            : "Не удалось загрузить шансы",
        );
        return;
      }

      setFavorites(favJson);
      setChances(chanceJson);
    } catch {
      setChancesError("Сеть недоступна. Проверьте chances-service.");
    } finally {
      setChancesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChances();
  }, [loadChances]);

  async function recalculateAll() {
    setCalcBusy(true);
    setChancesError(null);
    try {
      const res = await fetch("/api/chances/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allSpecialties: true }),
      });
      const json = (await res.json().catch(() => null)) as
        | ChanceResult[]
        | { error?: string }
        | null;
      if (!res.ok || !Array.isArray(json)) {
        setChancesError(
          json && !Array.isArray(json) && json.error
            ? json.error
            : "Не удалось пересчитать шансы",
        );
        return;
      }
      setChances(json);
    } catch {
      setChancesError("Сеть недоступна при пересчёте.");
    } finally {
      setCalcBusy(false);
    }
  }

  async function toggleFavorite(specialtyId: string) {
    setBusySpecialtyId(specialtyId);
    setChancesError(null);
    try {
      const isFav = favoriteIds.has(specialtyId);
      if (isFav) {
        const res = await fetch(`/api/favorites/${specialtyId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setChancesError(json?.error || "Не удалось убрать из избранного");
          return;
        }
        setFavorites((prev) => prev.filter((f) => f.specialtyId !== specialtyId));
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ specialtyId }),
        });
        const json = (await res.json().catch(() => null)) as
          | Favorite
          | { error?: string }
          | null;
        if (!res.ok || !json || !("specialtyId" in json)) {
          setChancesError(
            json && "error" in json && json.error
              ? json.error
              : "Не удалось добавить в избранное",
          );
          return;
        }
        setFavorites((prev) => [json, ...prev]);
      }
    } catch {
      setChancesError("Сеть недоступна.");
    } finally {
      setBusySpecialtyId(null);
    }
  }

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
      if (filters.chance) {
        const chance = chanceBySpecialty.get(item.id);
        if (filters.chance === "none") {
          if (chance) return false;
        } else if (!chance || chance.status !== filters.chance) {
          return false;
        }
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "ru");
      const scoreA = latestPassingScore(a.passingScores)?.score ?? -1;
      const scoreB = latestPassingScore(b.passingScores)?.score ?? -1;
      return sort === "score-desc" ? scoreB - scoreA : scoreA - scoreB;
    });

    return rows;
  }, [filters, sort, specialties, chanceBySpecialty]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Подбор специальностей по баллам
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Фильтры слева, карточки специальностей справа с оценкой шансов.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void recalculateAll()}
          disabled={calcBusy || chancesLoading}
          className="rounded-[10px] bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {calcBusy ? "Пересчёт…" : "Пересчитать шансы"}
        </button>
      </div>

      {chancesError ? (
        <p className="rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {chancesError}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wide text-text-muted">
              Фильтры подбора
            </h2>
            <button
              type="button"
              onClick={() => setFilters(emptyFilters)}
              className="text-xs font-bold text-brand-700 hover:underline"
            >
              Сбросить
            </button>
          </div>

          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-text-secondary">
                ВУЗ / ССУЗ
              </span>
              <input
                className={fieldClass}
                value={filters.university}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, university: e.target.value }))
                }
                placeholder="Название учреждения"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-text-secondary">
                Специальность
              </span>
              <input
                className={fieldClass}
                value={filters.specialty}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, specialty: e.target.value }))
                }
                placeholder="Название или код"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-text-secondary">
                Необходимые предметы ЦТ
              </span>
              <select
                className={fieldClass}
                value={filters.subjectIds[0] || ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    subjectIds: e.target.value ? [e.target.value] : [],
                  }))
                }
              >
                <option value="">Все предметы</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-text-secondary">Город</span>
              <select
                className={fieldClass}
                value={filters.city}
                onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
              >
                <option value="">Все города</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-text-secondary">
                Основа обучения
              </span>
              <div className="flex gap-2">
                {(
                  [
                    ["", "Все"],
                    ["budget", "Бюджет"],
                    ["paid", "Платное"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value || "all"}
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, funding: value }))}
                    className={cn(
                      "flex-1 rounded-[10px] border px-2 py-2 text-xs font-bold",
                      filters.funding === value
                        ? "border-brand-700 bg-brand-100 text-brand-900"
                        : "border-border text-text-secondary hover:bg-[#f8fafc]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-text-secondary">Форма</span>
              <select
                className={fieldClass}
                value={filters.studyForm}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, studyForm: e.target.value }))
                }
              >
                <option value="">Любая</option>
                <option value="fulltime">Очное</option>
                <option value="parttime">Заочное</option>
                <option value="distance">Дистанционное</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-text-secondary">Тип</span>
              <select
                className={fieldClass}
                value={filters.type}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="">Все</option>
                <option value="university">ВУЗ</option>
                <option value="college">Колледж</option>
              </select>
            </label>

            <div className="space-y-2 border-t border-border pt-3">
              <span className="text-xs font-semibold text-text-secondary">
                Шанс поступления
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["", "Все"],
                    ["green", "Проходит"],
                    ["yellow", "На грани"],
                    ["red", "Не хватает"],
                    ["none", "Без оценки"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value || "all"}
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, chance: value }))}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold",
                      filters.chance === value
                        ? "border-brand-700 bg-brand-100 text-brand-900"
                        : "border-border text-text-secondary hover:bg-[#f8fafc]",
                    )}
                  >
                    {value && value !== "none" ? (
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          value === "green" && "bg-emerald-500",
                          value === "yellow" && "bg-amber-400",
                          value === "red" && "bg-rose-500",
                        )}
                      />
                    ) : null}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-text-secondary">
              Найдено{" "}
              <span className="text-brand-900">{filtered.length}</span>{" "}
              {filtered.length === 1
                ? "специальность"
                : filtered.length >= 2 && filtered.length <= 4
                  ? "специальности"
                  : "специальностей"}
              {chancesLoading ? " · загрузка шансов…" : ""}
            </p>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <span>Сортировка:</span>
              <select
                className="rounded-[10px] border border-border bg-white px-3 py-2 text-sm"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
              >
                <option value="score-desc">Проходной балл (убыв.)</option>
                <option value="score-asc">Проходной балл (возр.)</option>
                <option value="name">По названию</option>
              </select>
            </label>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-[14px] border border-border bg-white p-6 text-sm text-text-secondary shadow-[var(--shadow-soft)]">
              По выбранным фильтрам ничего не найдено.
            </p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((item) => {
                const institution = item.institution!;
                const passing = latestPassingScore(item.passingScores);
                const chance = chanceBySpecialty.get(item.id);
                const isFav = favoriteIds.has(item.id);
                const accent = accentForChance(chance?.status);
                const gap = chance?.scoreGap;
                const gapText =
                  gap == null
                    ? null
                    : gap > 0
                      ? `не хватает ${gap}`
                      : gap < 0
                        ? `запас ${Math.abs(gap)}`
                        : "вровень";

                return (
                  <li
                    key={item.id}
                    className={cn(
                      "overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]",
                      "border-l-4",
                      accent.border,
                    )}
                  >
                    <div className="p-4 md:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {chance ? (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold",
                                  accent.badge,
                                )}
                              >
                                <span className={cn("h-1.5 w-1.5 rounded-full", accent.dot)} />
                                {catalogChanceLabel(chance.status)}
                              </span>
                            ) : (
                              <span className="rounded-full bg-[#eef2f5] px-2.5 py-0.5 text-xs font-bold text-text-muted">
                                Нет оценки
                              </span>
                            )}
                            {gapText ? (
                              <span className="rounded-full bg-[#f4f7f9] px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
                                {gapText}
                              </span>
                            ) : null}
                          </div>

                          <div>
                            <h3 className="text-base font-extrabold text-brand-900">
                              {institution.shortName} — {institution.fullName}
                            </h3>
                            <p className="mt-0.5 text-sm font-semibold text-text-primary">
                              {item.name}
                            </p>
                            <p className="text-xs text-text-muted">
                              Код ОКРБ {item.okrbCode} · {institutionTypeLabel(institution.type)}
                            </p>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <Meta label="Город" value={institution.city || "—"} />
                            <Meta
                              label={`Проходной ${passing?.year ?? ""}`.trim()}
                              value={
                                passing
                                  ? `${passing.score} баллов`
                                  : "нет данных"
                              }
                            />
                            <Meta
                              label="Основа / форма"
                              value={`${fundingLabel(item.funding)}, ${studyFormLabel(item.studyForm)}`}
                            />
                            <Meta
                              label="План набора"
                              value={`${item.placesPlan} мест`}
                            />
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                            Шанс
                          </div>
                          <div
                            className={cn(
                              "text-3xl font-black leading-none",
                              accent.percent,
                            )}
                          >
                            {chance?.probability != null
                              ? `${Math.round(chance.probability * 100)}%`
                              : "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={busySpecialtyId === item.id}
                          onClick={() => void toggleFavorite(item.id)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-[10px] border px-3 py-2 text-sm font-bold",
                            isFav
                              ? "border-brand-700 bg-brand-100 text-brand-900"
                              : "border-border text-brand-800 hover:bg-[#f8fafc]",
                          )}
                        >
                          <BookmarkIcon filled={isFav} />
                          {isFav ? "В избранном" : "В избранное"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId((id) => (id === item.id ? null : item.id))
                          }
                          className="rounded-[10px] border border-brand-700 px-3 py-2 text-sm font-bold text-brand-800 hover:bg-brand-100"
                        >
                          Подробнее
                        </button>
                      </div>

                      {expandedId === item.id ? (
                        <div className="mt-4 rounded-[12px] border border-border bg-[#f8fafc] p-3 text-sm text-text-secondary">
                          <p className="font-semibold text-brand-900">Предметы ЦТ</p>
                          <ul className="mt-2 space-y-1">
                            {(item.subjects || []).length === 0 ? (
                              <li>Предметы не указаны</li>
                            ) : (
                              (item.subjects || []).map((s) => (
                                <li key={s.id}>
                                  {s.subject?.name || s.subjectId}
                                  {s.minScore ? ` · мин. ${s.minScore}` : ""}
                                </li>
                              ))
                            )}
                          </ul>
                        </div>
                      ) : null}
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-text-primary">{value}</div>
    </div>
  );
}

function accentForChance(status?: ChanceStatus) {
  if (status === "green") {
    return {
      border: "border-l-emerald-500",
      badge: "bg-emerald-50 text-emerald-800",
      dot: "bg-emerald-500",
      percent: "text-emerald-700",
    };
  }
  if (status === "yellow") {
    return {
      border: "border-l-amber-400",
      badge: "bg-amber-50 text-amber-900",
      dot: "bg-amber-400",
      percent: "text-amber-700",
    };
  }
  if (status === "red") {
    return {
      border: "border-l-rose-500",
      badge: "bg-rose-50 text-rose-800",
      dot: "bg-rose-500",
      percent: "text-rose-700",
    };
  }
  return {
    border: "border-l-border",
    badge: "bg-[#eef2f5] text-text-muted",
    dot: "bg-text-muted",
    percent: "text-text-muted",
  };
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
