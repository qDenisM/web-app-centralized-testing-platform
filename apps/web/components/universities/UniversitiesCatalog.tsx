"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fundingLabel,
  institutionTypeLabel,
  latestPassingScore,
  studyFormLabel,
  type CatalogSpecialty,
  type CatalogSubject,
} from "@/lib/catalog";
import type { ChanceResult, ChanceStatus, Favorite } from "@/lib/chances";
import {
  catalogChanceDetail,
  catalogChanceLabel,
  catalogChancePercent,
  isChanceIncomplete,
} from "@/lib/chances-display";
import {
  ChevronDown,
  FilterSelect,
} from "@/components/ui/FilterSelect";
import { cn } from "@/lib/utils";

type UniversitiesCatalogProps = {
  specialties: CatalogSpecialty[];
  subjects: CatalogSubject[];
};

type SortMode = "score-desc" | "score-asc" | "name";
type ChanceFilter = "" | "green" | "yellow" | "red" | "none";

/** Initial paint + "show more" chunks — avoids mounting 400+ heavy cards at once. */
const PAGE_SIZE = 24;

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

function RadioMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-[1.5px]",
        checked ? "border-brand-700" : "border-brand-500/70",
      )}
      aria-hidden
    >
      {checked ? <span className="h-1.5 w-1.5 rounded-full bg-brand-700" /> : null}
    </span>
  );
}

function SubjectsMultiSelect({
  subjects,
  value,
  onChange,
}: {
  subjects: CatalogSubject[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = useMemo(() => {
    const set = new Set(value);
    return subjects.filter((s) => set.has(s.id));
  }, [subjects, value]);

  const label =
    selected.length === 0
      ? "Все предметы"
      : selected.map((s) => s.name).join(", ");

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else onChange([...value, id]);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          fieldClass,
          "flex items-center justify-between gap-2 text-left",
          open && "border-brand-500 ring-2 ring-brand-100",
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            selected.length === 0 && "text-text-muted",
          )}
        >
          {label}
        </span>
        <ChevronDown
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-[10px] border border-border bg-white py-1 shadow-[var(--shadow-soft)]"
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary hover:bg-[#f4f7f9]"
            onClick={() => onChange([])}
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded border",
                value.length === 0
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-border bg-white",
              )}
            >
              {value.length === 0 ? (
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2.5 6L5 8.5L9.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>
            Все предметы
          </button>
          {subjects.map((s) => {
            const checked = value.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={checked}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary hover:bg-[#f4f7f9]"
                onClick={() => toggle(s.id)}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    checked
                      ? "border-brand-700 bg-brand-700 text-white"
                      : "border-border bg-white",
                  )}
                >
                  {checked ? (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6L5 8.5L9.5 3.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
                {s.name}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  // Reset window when filters/sort change so users see top matches first.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters, sort]);

  const visibleRows = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );
  const hasMore = visibleCount < filtered.length;

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

            <div className="block space-y-1">
              <span className="text-xs font-semibold text-text-secondary">
                Необходимые предметы ЦТ
              </span>
              <SubjectsMultiSelect
                subjects={subjects}
                value={filters.subjectIds}
                onChange={(subjectIds) =>
                  setFilters((f) => ({ ...f, subjectIds }))
                }
              />
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-text-secondary">Город</span>
              <FilterSelect
                value={filters.city}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, city: e.target.value }))
                }
              >
                <option value="">Все города</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </FilterSelect>
            </label>

            <div className="space-y-1.5">
              <span className="text-sm font-bold text-text-primary">
                Основа обучения
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    ["budget", "Бюджет"],
                    ["paid", "Платное"],
                  ] as const
                ).map(([value, label]) => {
                  const checked = filters.funding === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          funding: f.funding === value ? "" : value,
                        }))
                      }
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-[10px] border bg-white px-3.5 py-2.5 text-left text-sm font-semibold transition-colors",
                        checked
                          ? "border-brand-600 text-text-primary"
                          : "border-border text-text-primary hover:border-brand-400",
                      )}
                    >
                      <span>{label}</span>
                      <RadioMark checked={checked} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="block space-y-1.5">
                <span className="text-sm font-bold text-text-primary">Формат</span>
                <FilterSelect
                  value={filters.studyForm}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, studyForm: e.target.value }))
                  }
                >
                  <option value="">Любой</option>
                  <option value="fulltime">Очное</option>
                  <option value="parttime">Заочное</option>
                  <option value="distance">Дистанционное</option>
                </FilterSelect>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-bold text-text-primary">Тип</span>
                <FilterSelect
                  value={filters.type}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, type: e.target.value }))
                  }
                >
                  <option value="">Все</option>
                  <option value="university">ВУЗ</option>
                  <option value="college">Колледж</option>
                </FilterSelect>
              </label>
            </div>

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
                    ["red", "Ниже проходного"],
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
              <FilterSelect
                className="w-auto min-w-[220px]"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
              >
                <option value="score-desc">Проходной балл (убыв.)</option>
                <option value="score-asc">Проходной балл (возр.)</option>
                <option value="name">По названию</option>
              </FilterSelect>
            </label>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-[14px] border border-border bg-white p-6 text-sm text-text-secondary shadow-[var(--shadow-soft)]">
              По выбранным фильтрам ничего не найдено.
            </p>
          ) : (
            <ul className="space-y-3">
              {visibleRows.map((item) => {
                const institution = item.institution!;
                const passing = latestPassingScore(item.passingScores);
                const chance = chanceBySpecialty.get(item.id);
                const isFav = favoriteIds.has(item.id);
                const incomplete = isChanceIncomplete(chance);
                const accent = accentForChance(chance?.status, incomplete);
                const gapText = catalogChanceDetail(chance);

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
                                {catalogChanceLabel(chance.status, chance)}
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
                            {chance ? catalogChancePercent(chance) : "—"}
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

          {hasMore ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((n) =>
                    Math.min(n + PAGE_SIZE, filtered.length),
                  )
                }
                className="rounded-[10px] border border-brand-700 px-4 py-2.5 text-sm font-bold text-brand-800 hover:bg-brand-100"
              >
                Показать ещё (
                {Math.min(PAGE_SIZE, filtered.length - visibleCount)} из{" "}
                {filtered.length - visibleCount})
              </button>
            </div>
          ) : null}
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

function accentForChance(status?: ChanceStatus, incomplete = false) {
  if (incomplete || !status) {
    return {
      border: "border-l-border",
      badge: "bg-[#eef2f5] text-text-muted",
      dot: "bg-text-muted",
      percent: "text-text-muted",
    };
  }
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
  return {
    border: "border-l-rose-500",
    badge: "bg-rose-50 text-rose-800",
    dot: "bg-rose-500",
    percent: "text-rose-700",
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
