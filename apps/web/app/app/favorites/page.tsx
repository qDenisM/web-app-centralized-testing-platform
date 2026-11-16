"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  chanceStatusLabel,
  type ChanceResult,
  type Favorite,
} from "@/lib/chances";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [chances, setChances] = useState<ChanceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [favRes, chanceRes] = await Promise.all([
          fetch("/api/favorites"),
          fetch("/api/chances/me"),
        ]);
        const favJson = (await favRes.json().catch(() => [])) as Favorite[];
        const chanceJson = (await chanceRes.json().catch(() => [])) as ChanceResult[];
        if (cancelled) return;
        if (!favRes.ok || !Array.isArray(favJson)) {
          setError("Не удалось загрузить избранное");
          return;
        }
        setFavorites(favJson);
        setChances(Array.isArray(chanceJson) ? chanceJson : []);
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
            return (
              <li
                key={fav.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border bg-white px-4 py-3 shadow-[var(--shadow-soft)]"
              >
                <div>
                  <div className="font-semibold text-brand-900">
                    Специальность {fav.specialtyId.slice(0, 8)}…
                  </div>
                  <div className="text-xs text-text-muted">
                    {chance
                      ? chanceStatusLabel(chance.status)
                      : "шанс не рассчитан"}
                  </div>
                </div>
                <Link
                  href="/app/universities"
                  className="text-sm font-bold text-brand-700 hover:underline"
                >
                  Подробнее
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
