"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  Campaign,
  CampaignStage,
  CatalogAdminStats,
  IdentityAdminStats,
} from "@/lib/admin";
import { roleLabel } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";

type StatsResponse = {
  identity: IdentityAdminStats;
  catalog: CatalogAdminStats;
};

type StagePhase = "done" | "active" | "upcoming";

type AttentionItem = {
  id: string;
  title: string;
  detail?: string;
  href: string;
  actionLabel: string;
};

function formatInt(n: number): string {
  return n.toLocaleString("ru-RU");
}

function parseDay(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatShortDate(iso: string): string {
  const d = parseDay(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}`;
}

function stagePhase(stage: CampaignStage, today: Date): StagePhase {
  if (
    stage.statusOverride === "done" ||
    stage.statusOverride === "active" ||
    stage.statusOverride === "upcoming"
  ) {
    return stage.statusOverride;
  }
  const start = parseDay(stage.startsOn).getTime();
  const end = parseDay(stage.endsOn).getTime();
  const t = today.getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return "upcoming";
  if (t > end) return "done";
  if (t < start) return "upcoming";
  return "active";
}

function stageStatusLine(stage: CampaignStage, phase: StagePhase): string {
  const from = formatShortDate(stage.startsOn);
  const to = formatShortDate(stage.endsOn);
  if (phase === "done") return `Завершён — ${to}`;
  if (phase === "active") return `Идёт — ${from} – ${to}`;
  return `Впереди — до ${to}`;
}

function daysUntil(iso: string, today: Date): number {
  const end = parseDay(iso).getTime();
  const t = today.getTime();
  return Math.ceil((end - t) / 86_400_000);
}

function dayOfStage(stage: CampaignStage, today: Date): number {
  const start = parseDay(stage.startsOn).getTime();
  return Math.floor((today.getTime() - start) / 86_400_000) + 1;
}

export function AdminDashboard() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, campaignsRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/campaigns"),
        ]);
        const statsJson = (await statsRes.json().catch(() => ({}))) as StatsResponse & {
          error?: string;
        };
        const campaignsJson = (await campaignsRes.json().catch(() => [])) as
          | Campaign[]
          | { error?: string };
        if (!statsRes.ok) {
          if (!cancelled) {
            setError(statsJson.error || "Не удалось загрузить статистику");
          }
          return;
        }
        if (!cancelled) {
          setData(statsJson);
          setCampaigns(Array.isArray(campaignsJson) ? campaignsJson : []);
        }
      } catch {
        if (!cancelled) setError("Сеть недоступна. Проверьте сервисы.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCampaign =
    campaigns.find((c) => c.isActive) || campaigns[0] || null;
  const campaignYear =
    data?.catalog.activeCampaignYear ??
    activeCampaign?.year ??
    new Date().getFullYear();

  const stages = useMemo(() => {
    const list = activeCampaign?.stages || [];
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [activeCampaign]);

  const currentStage = useMemo(
    () => stages.find((s) => stagePhase(s, today) === "active") || null,
    [stages, today],
  );

  const attention = useMemo(() => {
    const items: AttentionItem[] = [];
    if (!data) return items;

    const missing = data.catalog.specialtiesWithoutPassingScore ?? 0;
    const samples = data.catalog.specialtiesWithoutPassingScoreSamples || [];
    if (missing > 0) {
      const sampleText = samples
        .slice(0, 3)
        .map((s) =>
          s.institutionShortName
            ? `${s.institutionShortName}: ${s.name}`
            : s.name,
        )
        .join(", ");
      items.push({
        id: "passing",
        title: `У ${missing} ${
          missing === 1
            ? "специальности"
            : missing < 5
              ? "специальностей"
              : "специальностей"
        } нет проходного балла за ${campaignYear} год`,
        detail: sampleText || undefined,
        href: "/admin/specialties",
        actionLabel: "Заполнить",
      });
    }

    if (!activeCampaign) {
      items.push({
        id: "no-campaign",
        title: "Нет активной приёмной кампании",
        detail: "Создайте кампанию и отметьте её активной.",
        href: "/admin/campaign",
        actionLabel: "Открыть",
      });
    } else {
      const resultsStage = stages.find((s) =>
        /результат/i.test(s.name),
      );
      const badDates = stages.filter((s) => {
        const a = parseDay(s.startsOn).getTime();
        const b = parseDay(s.endsOn).getTime();
        return Number.isNaN(a) || Number.isNaN(b) || a > b;
      });
      if (!resultsStage) {
        items.push({
          id: "results-stage",
          title: "Не заданы точные даты этапа «Результаты ЦТ»",
          detail:
            "Без этого таймлайны для абитуриентов могут работать некорректно.",
          href: "/admin/campaign",
          actionLabel: "Указать даты",
        });
      } else if (badDates.length > 0) {
        items.push({
          id: "bad-dates",
          title: "У части этапов кампании некорректные даты",
          detail: badDates.map((s) => s.name).join(", "),
          href: "/admin/campaign",
          actionLabel: "Указать даты",
        });
      }
    }

    return items;
  }, [data, activeCampaign, stages, campaignYear]);

  const roleBits = data
    ? (
        [
          ["admin", "Администраторы"],
          ["moderator", "Модераторы"],
          ["examiner", "Экзаменаторы"],
          ["applicant", "Абитуриенты"],
        ] as const
      )
        .map(([role, label]) => {
          const n = data.identity.byRole[role] ?? 0;
          return n > 0 ? `${label} ${formatInt(n)}` : null;
        })
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Оперативный обзор системы
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Сводная статистика платформы СТСР на текущий день.
        </p>
      </div>

      {error ? (
        <Alert>{error}</Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Пользователи
              </p>
              <p className="mt-2 text-3xl font-black text-brand-900">
                {formatInt(data.identity.usersTotal)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                {roleBits || "Нет данных по ролям"}
              </p>
              {data.identity.usersBlocked > 0 ? (
                <p className="mt-2 text-xs font-bold text-[#9B2C2C]">
                  {formatInt(data.identity.usersBlocked)} пользователей
                  заблокировано
                </p>
              ) : (
                <p className="mt-2 text-xs font-semibold text-[#176B45]">
                  Заблокированных нет
                </p>
              )}
            </article>

            <article className="rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Учебные заведения
              </p>
              <p className="mt-2 text-3xl font-black text-brand-900">
                {formatInt(data.catalog.institutions)}
              </p>
              <p className="mt-2 text-xs text-text-secondary">
                Вузов {formatInt(data.catalog.institutionsUniversity ?? 0)} ·
                Колледжей {formatInt(data.catalog.institutionsCollege ?? 0)}
              </p>
              <p className="mt-2 text-xs text-text-secondary">
                Опубликовано{" "}
                {formatInt(data.catalog.institutionsPublished ?? 0)}, скрыто{" "}
                {formatInt(data.catalog.institutionsHidden ?? 0)}
              </p>
            </article>

            <article className="rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Специальности
              </p>
              <p className="mt-2 text-3xl font-black text-brand-900">
                {formatInt(data.catalog.specialties)}
              </p>
              <p className="mt-2 text-xs text-text-secondary">
                Бюджет {formatInt(data.catalog.specialtiesBudget ?? 0)} · Платное{" "}
                {formatInt(data.catalog.specialtiesPaid ?? 0)}
              </p>
              {(data.catalog.specialtiesWithoutPassingScore ?? 0) > 0 ? (
                <p className="mt-2 text-xs font-bold text-[#9A6B00]">
                  {formatInt(data.catalog.specialtiesWithoutPassingScore ?? 0)}{" "}
                  без проходного балла за {campaignYear}
                </p>
              ) : (
                <p className="mt-2 text-xs font-semibold text-[#176B45]">
                  Проходные баллы за {campaignYear} заполнены
                </p>
              )}
            </article>

            <article className="rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Текущий этап
              </p>
              {currentStage ? (
                <>
                  <p className="mt-2 text-xl font-black leading-tight text-brand-900">
                    {currentStage.name}
                  </p>
                  <p className="mt-2 text-xs text-text-secondary">
                    День {Math.max(1, dayOfStage(currentStage, today))} этапа
                  </p>
                  <p className="mt-1 text-xs font-semibold text-brand-800">
                    До завершения:{" "}
                    {Math.max(0, daysUntil(currentStage.endsOn, today))} дн. (до{" "}
                    {formatShortDate(currentStage.endsOn)})
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-xl font-black leading-tight text-brand-900">
                    Нет активного этапа
                  </p>
                  <p className="mt-2 text-xs text-text-secondary">
                    {activeCampaign
                      ? "Все этапы завершены или ещё не начались"
                      : "Создайте приёмную кампанию"}
                  </p>
                </>
              )}
            </article>
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <div className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
              <h2 className="text-sm font-bold uppercase tracking-wide text-text-muted">
                Требует внимания администратора
              </h2>
              {attention.length === 0 ? (
                <p className="mt-4 rounded-[10px] border border-[#176B45]/20 bg-[#E4F6EC] px-3 py-2.5 text-sm font-semibold text-[#176B45]">
                  Критичных задач нет
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {attention.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-[12px] border border-[#C6900A]/25 bg-[#FFF4D6] px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#7A5200]">
                          {item.title}
                        </p>
                        {item.detail ? (
                          <p className="mt-1 text-xs text-[#9A6B00]">
                            {item.detail}
                          </p>
                        ) : null}
                      </div>
                      <Link
                        href={item.href}
                        className="shrink-0 rounded-[10px] bg-brand-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-800"
                      >
                        {item.actionLabel}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
              <h2 className="text-sm font-bold uppercase tracking-wide text-text-muted">
                Календарь кампании {campaignYear}
              </h2>
              {!activeCampaign || stages.length === 0 ? (
                <p className="mt-4 text-sm text-text-muted">
                  Этапы кампании не заданы.
                </p>
              ) : (
                <ol className="relative mt-5 space-y-3 border-l-2 border-brand-100 pl-5">
                  {stages.map((stage, index) => {
                    const phase = stagePhase(stage, today);
                    return (
                      <li key={stage.id} className="relative">
                        <span
                          className={cn(
                            "absolute -left-[1.4rem] top-3 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black",
                            phase === "done"
                              ? "bg-[#176B45] text-white"
                              : phase === "active"
                                ? "bg-[#2F6FAE] text-white"
                                : "bg-[#d8dee5] text-brand-900",
                          )}
                        >
                          {index + 1}
                        </span>
                        <div
                          className={cn(
                            "rounded-[12px] border px-3.5 py-3",
                            phase === "done"
                              ? "border-[#176B45]/20 bg-[#E4F6EC]"
                              : phase === "active"
                                ? "border-[#2F6FAE]/25 bg-[#E7F0F8]"
                                : "border-border bg-[#f8fafc]",
                          )}
                        >
                          <p className="text-sm font-extrabold text-brand-900">
                            {stage.name}
                          </p>
                          <p
                            className={cn(
                              "mt-1 text-xs font-semibold",
                              phase === "done"
                                ? "text-[#176B45]"
                                : phase === "active"
                                  ? "text-[#2F6FAE]"
                                  : "text-text-muted",
                            )}
                          >
                            {stageStatusLine(stage, phase)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </section>

          <p className="text-xs text-text-muted">
            Роли в системе:{" "}
            {Object.entries(data.identity.byRole)
              .map(([role, count]) => `${roleLabel(role)} ${count}`)
              .join(" · ") || "—"}
            {" · "}
            Предметов ЦТ: {formatInt(data.catalog.subjects)}
          </p>
        </>
      ) : null}
    </div>
  );
}
