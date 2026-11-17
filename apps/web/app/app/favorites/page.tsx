"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { type ChanceResult, type Favorite } from "@/lib/chances";
import { catalogChanceLabel } from "@/lib/chances-display";
import type { CatalogSpecialty } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [chances, setChances] = useState<ChanceResult[]>([]);
  const [specialties, setSpecialties] = useState<CatalogSpecialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [favRes, chanceRes, specRes] = await Promise.all([
          fetch("/api/favorites"),
          fetch("/api/chances/me"),
          fetch("/api/catalog/specialties"),
        ]);
        const favJson = (await favRes.json().catch(() => [])) as Favorite[];
        const chanceJson = (await chanceRes.json().catch(() => [])) as ChanceResult[];
        const specJson = (await specRes.json().catch(() => [])) as CatalogSpecialty[];
        if (cancelled) return;
        if (!favRes.ok || !Array.isArray(favJson)) {
          setError("Не удалось загрузить избранное");
          return;
        }
        setFavorites(favJson);
        setChances(Array.isArray(chanceJson) ? chanceJson : []);
        setSpecialties(Array.isArray(specJson) ? specJson : []);
      } catch {
        if (!cancelled) setError("Сеть недоступна");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const specialtyById = useMemo(() => {
    const map = new Map<string, CatalogSpecialty>();
    for (const row of specialties) map.set(row.id, row);
    return map;
  }, [specialties]);

  async function removeFavorite(specialtyId: string) {
    setBusyId(specialtyId);
    setError(null);
    try {
      const res = await fetch(`/api/favorites/${specialtyId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(json?.error || "Не удалось убрать из избранного");
        return;
      }
      setFavorites((prev) => prev.filter((f) => f.specialtyId !== specialtyId));
    } catch {
      setError("Сеть недоступна");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Избранные специальности
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Специальности, которые вы отметили в каталоге вузов.
          </p>
        </div>
        <Link
          href="/app/universities"
          className="rounded-[10px] bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
        >
          Открыть каталог
        </Link>
      </div>

      {loading ? <p className="text-sm text-text-muted">Загрузка…</p> : null}
      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && !error && favorites.length === 0 ? (
        <p className="rounded-[14px] border border-border bg-white p-5 text-sm text-text-secondary shadow-[var(--shadow-soft)]">
          Пока пусто. Добавьте специальности на странице{" "}
          <Link href="/app/universities" className="font-bold text-brand-700">
            Университеты
          </Link>
          .
        </p>
      ) : null}

      {!loading && favorites.length > 0 ? (
        <ul className="space-y-2">
          {favorites.map((fav) => {
            const chance = chances.find((c) => c.specialtyId === fav.specialtyId);
            const specialty = specialtyById.get(fav.specialtyId);
            const institution = specialty?.institution;
            const title = specialty
              ? institution
                ? `${institution.shortName} — ${specialty.name}`
                : specialty.name
              : null;
            return (
              <li
                key={fav.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border bg-white px-4 py-3 shadow-[var(--shadow-soft)]"
              >
                <div>
                  <div className="font-semibold text-brand-900">
                    {title || "Специальность недоступна в каталоге"}
                  </div>
                  <div
                    className={cn(
                      "text-xs font-semibold",
                      chance?.status === "green" && "text-emerald-700",
                      chance?.status === "yellow" && "text-amber-800",
                      chance?.status === "red" && "text-rose-700",
                      !chance && "text-text-muted",
                    )}
                  >
                    {chance
                      ? `${catalogChanceLabel(chance.status)}${
                          chance.probability != null
                            ? ` · ${Math.round(chance.probability)}%`
                            : ""
                        }`
                      : "шанс не рассчитан"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={busyId === fav.specialtyId}
                    onClick={() => void removeFavorite(fav.specialtyId)}
                    className="text-sm font-bold text-rose-700 hover:underline disabled:opacity-60"
                  >
                    Убрать
                  </button>
                  <Link
                    href="/app/universities"
                    className="text-sm font-bold text-brand-700 hover:underline"
                  >
                    Подробнее
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
