"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApplicantProfile } from "@/lib/applicant";
import { verificationStatusLabel } from "@/lib/applicant";
import type { ChanceResult, Favorite } from "@/lib/chances";
import type { CatalogSpecialty, CatalogSubject } from "@/lib/catalog";
import { latestPassingScore } from "@/lib/catalog";
import { catalogChanceLabel } from "@/lib/chances-display";
import type { CtResult } from "@/lib/results";
import {
  formatExamWhen,
  type ExamApplication,
} from "@/lib/exam";
import { computeCompetitiveScore } from "@/lib/competitive-score";
import { cn } from "@/lib/utils";

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

const CT_MAX = 300;
const ATTESTAT_MAX = 10;
const COMPETITIVE_MAX = 400;

function accentForChance(status: ChanceResult["status"] | undefined) {
  if (status === "green") {
    return {
      border: "border-l-[#1F8A58]",
      badge: "bg-[#E4F6EC] text-[#176B45]",
    };
  }
  if (status === "yellow") {
    return {
      border: "border-l-[#C6900A]",
      badge: "bg-[#FFF4D6] text-[#9A6B00]",
    };
  }
  if (status === "red") {
    return {
      border: "border-l-[#C94343]",
      badge: "bg-[#FDECEC] text-[#9B2C2C]",
    };
  }
  return {
    border: "border-l-border",
    badge: "bg-[#eef2f5] text-text-muted",
  };
}

type CampaignLifecycle = "upcoming" | "active" | "completed";

function campaignLifecycle(
  stages: CampaignStage[],
  now: number,
): CampaignLifecycle {
  if (stages.length === 0) return "upcoming";
  const starts = stages.map((s) => new Date(s.startsOn).getTime());
  const ends = stages.map(
    (s) => new Date(s.endsOn).getTime() + 86400000 - 1,
  );
  const first = Math.min(...starts);
  const last = Math.max(...ends);
  if (now > last) return "completed";
  if (now < first) return "upcoming";
  return "active";
}

type StageTone = { dot: string; badge: string; label: string };

const STAGE_TONES = {
  done: {
    dot: "bg-[#1F8A58]",
    badge: "bg-[#E4F6EC] text-[#176B45]",
    label: "Завершён",
  },
  current: {
    dot: "bg-brand-700",
    badge: "bg-brand-100 text-brand-800",
    label: "Текущий этап",
  },
  expected: {
    dot: "bg-[#C6900A]",
    badge: "bg-[#FFF4D6] text-[#9A6B00]",
    label: "Ожидается",
  },
  locked: {
    dot: "bg-[#c5ced6]",
    badge: "bg-[#eef2f5] text-text-muted",
    label: "Недоступно",
  },
} as const satisfies Record<string, StageTone>;

/**
 * Green = past, blue = current, yellow = next upcoming,
 * gray = after "expected" or campaign already finished (locked).
 */
function stageToneFor(
  stages: Array<{ start: number; end: number }>,
  index: number,
  now: number,
  lifecycle: CampaignLifecycle,
): StageTone {
  const stage = stages[index];
  if (!stage) return STAGE_TONES.locked;

  // Whole campaign is over → stages are locked/unavailable (gray).
  if (lifecycle === "completed") {
    return STAGE_TONES.locked;
  }

  if (now > stage.end) {
    return STAGE_TONES.done;
  }
  if (now >= stage.start && now <= stage.end) {
    return STAGE_TONES.current;
  }

  // First future stage is "expected"; anything after it is locked.
  const nextIdx = stages.findIndex((s) => now < s.start);
  if (nextIdx === index) {
    return STAGE_TONES.expected;
  }
  if (nextIdx >= 0 && index > nextIdx) {
    return STAGE_TONES.locked;
  }

  return STAGE_TONES.locked;
}

export function ApplicantDashboard() {
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [results, setResults] = useState<CtResult[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [chances, setChances] = useState<ChanceResult[]>([]);
  const [campaign, setCampaign] = useState<ActiveCampaign>(null);
  const [applications, setApplications] = useState<ExamApplication[]>([]);
  const [passBusyId, setPassBusyId] = useState<string | null>(null);
  const [favBusyId, setFavBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [specialties, setSpecialties] = useState<CatalogSpecialty[]>([]);
  const [subjects, setSubjects] = useState<CatalogSubject[]>([]);
  const [exams, setExams] = useState<
    Array<{ id: string; subjectId: string; startsAt?: string }>
  >([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [
          profileRes,
          resultsRes,
          favRes,
          chanceRes,
          campRes,
          appsRes,
          specRes,
          subjRes,
          examsRes,
        ] = await Promise.all([
          fetch("/api/applicant/profile"),
          fetch("/api/results/me"),
          fetch("/api/favorites"),
          fetch("/api/chances/me"),
          fetch("/api/catalog/campaigns/active"),
          fetch("/api/exam/applications/me"),
          fetch("/api/catalog/specialties"),
          fetch("/api/catalog/subjects"),
          fetch("/api/exam/exams"),
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
        const appsJson = (await appsRes.json().catch(() => [])) as
          | ExamApplication[]
          | { error?: string };
        const specJson = (await specRes.json().catch(() => [])) as
          | CatalogSpecialty[]
          | { error?: string };
        const subjJson = (await subjRes.json().catch(() => [])) as
          | CatalogSubject[]
          | { error?: string };
        const examsJson = (await examsRes.json().catch(() => [])) as
          | Array<{ id: string; subjectId: string; startsAt?: string }>
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
        if (appsRes.ok && Array.isArray(appsJson)) {
          setApplications(appsJson);
        }
        if (specRes.ok && Array.isArray(specJson)) {
          setSpecialties(specJson);
        }
        if (subjRes.ok && Array.isArray(subjJson)) {
          setSubjects(subjJson);
        }
        if (examsRes.ok && Array.isArray(examsJson)) {
          setExams(examsJson);
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

  const subjectName = useCallback(
    (subjectId: string | undefined) =>
      subjects.find((s) => s.id === subjectId)?.name || "Предмет",
    [subjects],
  );

  const scoreParts = useMemo(
    () =>
      computeCompetitiveScore({
        results,
        profile,
        exams,
      }),
    [results, profile, exams],
  );

  const publishedScores = scoreParts.subjectScores;
  const ctSum = scoreParts.ctSum;
  const attestat = profile?.attestatAverage ?? null;
  const attestatPoints = scoreParts.attestatPoints;
  const competitive = scoreParts.competitive;

  const stages = campaign?.stages || [];
  const now = Date.now();

  const specialtyById = useMemo(() => {
    const map = new Map<string, CatalogSpecialty>();
    for (const row of specialties) map.set(row.id, row);
    return map;
  }, [specialties]);

  const greenFavorites = useMemo(() => {
    return favorites.filter((fav) => {
      const chance = chances.find((c) => c.specialtyId === fav.specialtyId);
      return chance?.status === "green";
    }).length;
  }, [favorites, chances]);

  const upcomingCt = useMemo(() => {
    const approved = applications.filter((app) => app.status === "approved");
    const future = approved
      .filter((app) => {
        if (!app.exam?.startsAt) return true;
        return new Date(app.exam.startsAt).getTime() >= now - 86400000;
      })
      .sort((a, b) => {
        const aAt = a.exam?.startsAt || "";
        const bAt = b.exam?.startsAt || "";
        return aAt.localeCompare(bAt);
      });
    return future.slice(0, 1);
  }, [applications, now]);

  const lifecycle = campaignLifecycle(stages, now);

  async function downloadPass(applicationId: string) {
    setPassBusyId(applicationId);
    try {
      const res = await fetch(`/api/exam/applications/${applicationId}/pass`);
      const json = (await res.json().catch(() => ({}))) as {
        downloadUrl?: string;
        error?: string;
      };
      if (!res.ok || !json.downloadUrl) {
        setError(json.error || "Пропуск ещё не готов");
        return;
      }
      window.open(json.downloadUrl, "_blank", "noopener,noreferrer");
    } finally {
      setPassBusyId(null);
    }
  }

  async function removeFavorite(specialtyId: string) {
    setFavBusyId(specialtyId);
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
      setFavBusyId(null);
    }
  }

  const ctBreakdown =
    publishedScores.length > 0
      ? publishedScores
          .map((s) => `${subjectName(s.subjectId)} (${s.score})`)
          .join(" + ")
      : "Нет опубликованных результатов ЦТ";

  const ctDone = publishedScores.length >= 3;
  const verificationStatus = profile?.verification?.status ?? null;
  // Verified only when average score exists AND moderator approved.
  // A leftover scan / old "approved" without score must not look verified.
  const attestatFooter = (() => {
    if (
      attestat != null &&
      (verificationStatus === "approved" || verificationStatus === "verified")
    ) {
      return { ok: true as const, label: "Верифицирован" };
    }
    if (attestat == null) {
      if (profile?.hasAttestatScan) {
        return { ok: false as const, label: "Нет среднего балла" };
      }
      return { ok: false as const, label: "Не отправлен" };
    }
    if (verificationStatus === "pending") {
      return { ok: false as const, label: "На проверке" };
    }
    if (verificationStatus === "rejected" || verificationStatus === "returned") {
      return {
        ok: false as const,
        label: verificationStatusLabel(verificationStatus),
      };
    }
    return { ok: false as const, label: "Ожидает проверки" };
  })();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Сводка абитуриента
        </h1>
        {campaign ? (
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-[8px] border px-3 py-1.5 text-xs font-bold",
              lifecycle === "active" &&
                "border-[#1F8A58]/20 bg-[#E4F6EC] text-[#176B45]",
              lifecycle === "completed" &&
                "border-[#C94343]/25 bg-[#FDECEC] text-[#9B2C2C]",
              lifecycle === "upcoming" &&
                "border-[#C6900A]/25 bg-[#FFF4D6] text-[#9A6B00]",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                lifecycle === "active" && "bg-[#1F8A58]",
                lifecycle === "completed" && "bg-[#C94343]",
                lifecycle === "upcoming" && "bg-[#C6900A]",
              )}
            />
            {lifecycle === "active"
              ? `Приёмная кампания ${campaign.year} активна`
              : lifecycle === "completed"
                ? `Приёмная кампания ${campaign.year} завершена`
                : `Приёмная кампания ${campaign.year} скоро`}
          </span>
        ) : null}
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
          <section className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
              <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                Сумма баллов ЦТ
              </p>
              <p className="mt-2 text-3xl font-black text-brand-900">
                {publishedScores.length ? ctSum : "—"}
                <span className="text-lg font-bold text-text-muted">
                  {" "}
                  / {CT_MAX}
                </span>
              </p>
              <p className="mt-2 text-sm text-text-secondary">{ctBreakdown}</p>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-text-secondary">
                  <span className={ctDone ? "text-[#1F8A58]" : "text-[#C94343]"}>
                    {ctDone ? "✓" : "✕"}
                  </span>
                  {publishedScores.length} из 3 экзаменов сданы
                </span>
                <Link
                  href="/app/ct"
                  className="font-bold text-brand-700 hover:underline"
                >
                  Подробнее
                </Link>
              </div>
            </article>

            <article className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
              <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                Средний балл аттестата
              </p>
              <p className="mt-2 text-3xl font-black text-brand-900">
                {attestat !== null ? attestat.toFixed(1) : "—"}
                <span className="text-lg font-bold text-text-muted">
                  {" "}
                  / {ATTESTAT_MAX.toFixed(1)}
                </span>
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                {attestatPoints !== null
                  ? `В конкурсе даёт ${attestatPoints} баллов`
                  : "Загрузите и подтвердите аттестат"}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-text-secondary">
                  <span
                    className={
                      attestatFooter.ok ? "text-[#1F8A58]" : "text-[#C94343]"
                    }
                  >
                    {attestatFooter.ok ? "✓" : "✕"}
                  </span>
                  {attestatFooter.label}
                </span>
                <Link
                  href="/app/certificate"
                  className="font-bold text-brand-700 hover:underline"
                >
                  Скан
                </Link>
              </div>
            </article>

            <article className="rounded-[14px] border-2 border-brand-300 bg-white p-5 shadow-[var(--shadow-soft)]">
              <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                Итоговый конкурсный балл
              </p>
              <p className="mt-2 text-3xl font-black text-brand-900">
                {competitive !== null ? competitive : "—"}
                <span className="text-lg font-bold text-text-muted">
                  {" "}
                  / {COMPETITIVE_MAX}
                </span>
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                {competitive !== null && attestatPoints !== null
                  ? `ЦТ ${ctSum} + Аттестат ${attestatPoints} = ${competitive} баллов`
                  : "Нужны баллы ЦТ и аттестат"}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                <span className="font-semibold text-text-secondary">
                  {greenFavorites > 0
                    ? `Доступно ${greenFavorites} гарантированных специальностей`
                    : "Оцените шансы по каталогу"}
                </span>
                <Link
                  href="/app/universities"
                  className="shrink-0 font-bold text-brand-700 hover:underline"
                >
                  Оценить шансы
                </Link>
              </div>
            </article>
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="space-y-5">
              <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
                <h2 className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                  Ближайшее ЦТ
                </h2>
                {upcomingCt.length === 0 ? (
                  <p className="mt-4 text-sm text-text-muted">
                    Нет одобренных записей.{" "}
                    <Link
                      href="/app/ct"
                      className="font-bold text-brand-700 hover:underline"
                    >
                      Записаться на ЦТ
                    </Link>
                  </p>
                ) : (
                  upcomingCt.map((app) => (
                    <div
                      key={app.id}
                      className="mt-4 rounded-[12px] border border-border bg-[#f8fafc] p-4"
                    >
                      <p className="text-sm font-extrabold text-brand-900">
                        {app.exam?.subjectId
                          ? subjectName(app.exam.subjectId)
                          : "Сеанс ЦТ"}
                        {app.exam?.startsAt
                          ? `, ${formatExamWhen(app.exam.startsAt)}`
                          : ""}
                      </p>
                      <p className="mt-2 text-sm text-text-secondary">
                        {app.exam?.venue?.name
                          ? `Площадка: ${app.exam.venue.name}`
                          : "Площадка уточняется"}
                        {app.exam?.venue?.address
                          ? ` · ${app.exam.venue.address}`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        С собой: паспорт, 2 чёрные гелевые ручки
                      </p>
                      <button
                        type="button"
                        disabled={passBusyId === app.id}
                        onClick={() => void downloadPass(app.id)}
                        className="mt-4 rounded-[10px] bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60"
                      >
                        {passBusyId === app.id
                          ? "Готовим…"
                          : "Скачать пропуск (PDF)"}
                      </button>
                    </div>
                  ))
                )}
              </section>

              <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                    Порядок приёмной кампании
                  </h2>
                  <span className="text-xs text-text-muted">
                    Календарь абитуриента
                  </span>
                </div>
                <ol className="mt-4 space-y-3">
                  {stages.length === 0 ? (
                    <li className="text-sm text-text-muted">
                      Этапы пока не заданы
                    </li>
                  ) : (
                    (() => {
                      const timeline = stages.map((stage) => ({
                        start: new Date(stage.startsOn).getTime(),
                        end:
                          new Date(stage.endsOn).getTime() + 86400000 - 1,
                      }));
                      return stages.map((stage, index) => {
                        const tone = stageToneFor(
                          timeline,
                          index,
                          now,
                          lifecycle,
                        );
                        return (
                          <li
                            key={stage.id}
                            className="flex items-start justify-between gap-3"
                          >
                            <div className="flex min-w-0 gap-3">
                              <span
                                className={cn(
                                  "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                                  tone.dot,
                                )}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-text-primary">
                                  {stage.name}
                                </p>
                                <p className="text-xs text-text-muted">
                                  {new Date(
                                    stage.startsOn,
                                  ).toLocaleDateString("ru-RU")}{" "}
                                  —{" "}
                                  {new Date(stage.endsOn).toLocaleDateString(
                                    "ru-RU",
                                  )}
                                </p>
                              </div>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                                tone.badge,
                              )}
                            >
                              {tone.label}
                            </span>
                          </li>
                        );
                      });
                    })()
                  )}
                </ol>
              </section>
            </div>

            <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                    Избранные специальности
                  </h2>
                  <p className="mt-1 text-xs text-text-secondary">
                    {competitive !== null
                      ? `Ваш балл: ${competitive}`
                      : "Добавьте баллы, чтобы оценить шансы"}
                  </p>
                </div>
                <Link
                  href="/app/universities"
                  className="shrink-0 text-sm font-bold text-brand-700 hover:underline"
                >
                  Каталог вузов →
                </Link>
              </div>

              {favorites.length === 0 ? (
                <p className="mt-4 text-sm text-text-muted">
                  Пока нет избранного. Добавьте специальности в каталоге вузов.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {favorites.slice(0, 6).map((fav) => {
                    const chance = chances.find(
                      (c) => c.specialtyId === fav.specialtyId,
                    );
                    const specialty = specialtyById.get(fav.specialtyId);
                    const institution = specialty?.institution;
                    const accent = accentForChance(chance?.status);
                    const gap = chance?.scoreGap;
                    const gapText =
                      gap == null
                        ? null
                        : gap < 0
                          ? `Не хватает: ${gap} баллов`
                          : gap > 0
                            ? `Запас: +${gap} баллов`
                            : "Вровень с проходным";
                    const passing = latestPassingScore(
                      specialty?.passingScores,
                    );
                    const title = specialty
                      ? institution
                        ? `${institution.shortName} — ${specialty.name}`
                        : specialty.name
                      : null;

                    return (
                      <li
                        key={fav.id}
                        className={cn(
                          "rounded-[12px] border border-border border-l-4 bg-white p-3.5",
                          accent.border,
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-brand-900">
                              {title || "Специальность недоступна в каталоге"}
                            </p>
                            {passing ? (
                              <p className="mt-0.5 text-xs text-text-muted">
                                Проходной {passing.year}: {passing.score}
                              </p>
                            ) : null}
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                              accent.badge,
                            )}
                          >
                            {chance
                              ? `${catalogChanceLabel(chance.status)}${
                                  chance.probability != null
                                    ? ` (${Math.round(chance.probability)}%)`
                                    : ""
                                }`
                              : "Нет оценки"}
                          </span>
                        </div>
                        {gapText ? (
                          <p className="mt-2 text-xs font-semibold text-text-secondary">
                            {gapText}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            disabled={favBusyId === fav.specialtyId}
                            onClick={() => void removeFavorite(fav.specialtyId)}
                            className="text-xs font-bold text-rose-700 hover:underline disabled:opacity-60"
                          >
                            Убрать
                          </button>
                          <Link
                            href="/app/universities"
                            className="text-xs font-bold text-brand-700 hover:underline"
                          >
                            Перейти к специальности
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
