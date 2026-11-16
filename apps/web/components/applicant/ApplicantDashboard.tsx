"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ApplicantProfile } from "@/lib/applicant";
import { verificationStatusLabel } from "@/lib/applicant";
import type { ChanceResult, Favorite } from "@/lib/chances";
import { chanceStatusLabel } from "@/lib/chances";
import type { CtResult } from "@/lib/results";
import { StatItem } from "@/components/ui/StatItem";

type CampaignStage = {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
};

type ActiveCampaign = {
  id: string;
  year: number;
  isActive?: boolean;
  status?: string;
  stages?: CampaignStage[];
} | null;

export function ApplicantDashboard() {
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [results, setResults] = useState<CtResult[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [chances, setChances] = useState<ChanceResult[]>([]);
  const [campaign, setCampaign] = useState<ActiveCampaign>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [profileRes, resultsRes, favRes, chanceRes, campRes] =
          await Promise.all([
            fetch("/api/applicant/profile"),
            fetch("/api/results/me"),
            fetch("/api/favorites"),
            fetch("/api/chances/me"),
            fetch("/api/catalog/campaigns/active"),
          ]);

        const profileJson = (await profileRes.json().catch(() => null)) as
          | ApplicantProfile
          | { error?: string }
          | null;
        const resultsJson = (await resultsRes.json().catch(() => [])) as
          | CtResult[]
          | { error?: string };
        const favJson = (await favRes.json().catch(() => [])) as
          | Favorite[]
          | { error?: string };
        const chanceJson = (await chanceRes.json().catch(() => [])) as
          | ChanceResult[]
          | { error?: string };
        const campJson = (await campRes.json().catch(() => null)) as
          | ActiveCampaign
          | { error?: string };

        if (cancelled) return;

        if (profileRes.ok && profileJson && !("error" in profileJson)) {
          setProfile(profileJson as ApplicantProfile);
        }
        if (resultsRes.ok && Array.isArray(resultsJson)) {
          setResults(resultsJson);
        }
        if (favRes.ok && Array.isArray(favJson)) {
          setFavorites(favJson);
        }
        if (chanceRes.ok && Array.isArray(chanceJson)) {
          setChances(chanceJson);
        }
        if (campRes.ok && campJson && !("error" in campJson)) {
          setCampaign(campJson as ActiveCampaign);
        }
      } catch {
        if (!cancelled) setError("Не удалось загрузить сводку");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const publishedScores = useMemo(
    () =>
      results.filter(
        (r) => r.status === "published" && typeof r.score === "number",
      ),
    [results],
  );

  const ctSum = publishedScores.reduce((acc, r) => acc + (r.score || 0), 0);
  const attestat = profile?.attestatAverage ?? null;
  const attestatPoints =
    attestat !== null ? Math.round(attestat * 10 * 10) / 10 : null;
  const competitive =
    attestatPoints !== null && publishedScores.length > 0
      ? Math.round((ctSum + attestatPoints) * 10) / 10
      : null;

  const stages = campaign?.stages || [];
  const now = Date.now();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="text-xs font-semibold text-text-muted">
            СТСР • Личный кабинет абитуриента
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-brand-900">
            Сводка абитуриента
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-text-secondary">
            Баллы ЦТ, аттестат, календарь кампании и избранные специальности.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {campaign?.status === "active" ? (
            <span className="inline-flex items-center gap-2 rounded-[8px] border border-[#1F8A58]/20 bg-[#E4F6EC] px-3 py-1.5 text-xs font-bold text-[#176B45]">
              <span className="h-2 w-2 rounded-full bg-[#1F8A58]" />
              Приёмная кампания {campaign.year} активна
            </span>
          ) : null}
          <Link
            href="/app/profile"
            className="rounded-[10px] border border-border bg-white px-4 py-2.5 text-sm font-bold text-text-secondary shadow-[var(--shadow-soft)] hover:bg-[#f8fafc]"
          >
            Анкета и профиль
          </Link>
        </div>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
              <StatItem value={String(ctSum || "—")} label="Сумма баллов ЦТ" />
            </div>
            <div className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
              <StatItem
                value={attestat !== null ? String(attestat) : "—"}
                label="Средний балл аттестата"
              />
            </div>
            <div className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
              <StatItem
                value={competitive !== null ? String(competitive) : "—"}
                label="Конкурсный балл"
              />
            </div>
            <div className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
              <StatItem
                value={verificationStatusLabel(profile?.verification?.status)}
                label="Статус анкеты"
              />
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
              <h2 className="text-sm font-bold uppercase tracking-wide text-text-muted">
                Календарь кампании
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {campaign
                  ? `Кампания ${campaign.year} · ${campaign.isActive || campaign.status === "active" ? "Online" : campaign.status || "активна"}`
                  : "Активная кампания не найдена"}
              </p>
              <ul className="mt-4 space-y-3">
                {stages.length === 0 ? (
                  <li className="text-sm text-text-muted">Этапы пока не заданы</li>
                ) : (
                  stages.map((stage) => {
                    const start = new Date(stage.startsOn).getTime();
                    const end = new Date(stage.endsOn).getTime() + 86400000 - 1;
                    const active = now >= start && now <= end;
                    return (
                      <li
                        key={stage.id}
                        className={`rounded-[10px] border px-3 py-2.5 text-sm ${
                          active
                            ? "border-brand-200 bg-brand-100 text-brand-900"
                            : "border-border bg-[#f8fafc] text-text-secondary"
                        }`}
                      >
                        <div className="font-semibold">{stage.name}</div>
                        <div className="mt-0.5 text-xs text-text-muted">
                          {new Date(stage.startsOn).toLocaleDateString("ru-RU")} —{" "}
                          {new Date(stage.endsOn).toLocaleDateString("ru-RU")}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>

            <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-text-muted">
                  Избранные специальности
                </h2>
                <Link
                  href="/app/universities"
                  className="text-sm font-semibold text-brand-700 hover:text-brand-900"
                >
                  Оценить шансы
                </Link>
              </div>
              {favorites.length === 0 ? (
                <p className="mt-4 text-sm text-text-muted">
                  Пока нет избранного. Добавьте специальности в каталоге вузов.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {favorites.slice(0, 5).map((fav) => {
                    const chance = chances.find(
                      (c) => c.specialtyId === fav.specialtyId,
                    );
                    return (
                      <li
                        key={fav.id}
                        className="flex items-center justify-between gap-2 rounded-[10px] border border-border px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-text-primary">
                          {fav.specialtyId.slice(0, 8)}…
                        </span>
                        <span className="text-xs text-text-muted">
                          {chance
                            ? chanceStatusLabel(chance.status)
                            : "шанс не рассчитан"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/app/ct"
                  className="rounded-[10px] border border-border px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-[#f8fafc]"
                >
                  Мои ЦТ
                </Link>
                <Link
                  href="/app/certificate"
                  className="rounded-[10px] border border-border px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-[#f8fafc]"
                >
                  Аттестат
                </Link>
                <Link
                  href="/app/universities"
                  className="rounded-[10px] bg-brand-700 px-3 py-2 text-sm font-bold text-white hover:bg-brand-800"
                >
                  Университеты
                </Link>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
