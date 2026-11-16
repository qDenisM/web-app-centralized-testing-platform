"use client";

import { useEffect, useState } from "react";
import type { Campaign, CatalogAdminStats, IdentityAdminStats } from "@/lib/admin";
import { roleLabel } from "@/lib/admin";
import { StatItem } from "@/components/ui/StatItem";
import { cn } from "@/lib/utils";

type StatsResponse = {
  identity: IdentityAdminStats;
  catalog: CatalogAdminStats;
};

export function AdminDashboard() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        const campaignsJson = (await campaignsRes.json().catch(() => [])) as Campaign[] & {
          error?: string;
        };
        if (!statsRes.ok) {
          if (!cancelled) setError(statsJson.error || "Не удалось загрузить статистику");
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

  const activeCampaign = campaigns.find((c) => c.isActive);
  const attention: { text: string; tone: "warn" | "info" }[] = [];

  if (data) {
    if (data.identity.usersBlocked > 0) {
      attention.push({
        text: `${data.identity.usersBlocked} заблокированных пользователей`,
        tone: "warn",
      });
    }
    if (!activeCampaign) {
      attention.push({ text: "Нет активной приёмной кампании", tone: "warn" });
    }
    if (data.catalog.passingScores === 0) {
      attention.push({ text: "Не заданы проходные баллы специальностей", tone: "info" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Оперативный обзор системы
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Сводные счётчики, зоны внимания и календарь приёмной кампании.
        </p>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : data ? (
        <>
          <section className="rounded-[14px] border border-border bg-white p-6">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-text-muted">
              Требует внимания
            </h2>
            {attention.length === 0 ? (
              <p className="text-sm text-text-muted">Критичных задач нет.</p>
            ) : (
              <ul className="space-y-2">
                {attention.map((item) => (
                  <li
                    key={item.text}
                    className={cn(
                      "rounded-[10px] px-3 py-2 text-sm font-semibold",
                      item.tone === "warn"
                        ? "border border-[#ffe7ba] bg-[#fff7e6] text-[#ad6800]"
                        : "border border-brand-200 bg-brand-50 text-brand-900",
                    )}
                  >
                    {item.text}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[14px] border border-border bg-white p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-text-muted">
              Пользователи
            </h2>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <StatItem value={String(data.identity.usersTotal)} label="Всего" />
              <StatItem value={String(data.identity.usersActive)} label="Активных" />
              <StatItem value={String(data.identity.usersBlocked)} label="Заблокированных" />
              <StatItem
                value={String(data.identity.byRole.applicant ?? 0)}
                label="Абитуриентов"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-secondary">
              {Object.entries(data.identity.byRole).map(([role, count]) => (
                <span
                  key={role}
                  className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-800"
                >
                  {roleLabel(role)}: {count}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-[14px] border border-border bg-white p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-text-muted">
              Каталог
            </h2>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-5">
              <StatItem value={String(data.catalog.institutions)} label="Вузы" />
              <StatItem value={String(data.catalog.specialties)} label="Специальности" />
              <StatItem value={String(data.catalog.subjects)} label="Предметы" />
              <StatItem value={String(data.catalog.campaigns)} label="Кампании" />
              <StatItem value={String(data.catalog.passingScores)} label="Проходные баллы" />
            </div>
          </section>

          <section className="rounded-[14px] border border-border bg-white p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-text-muted">
              Календарь приёмной кампании
            </h2>
            {campaigns.length === 0 ? (
              <p className="text-sm text-text-muted">Кампании не созданы.</p>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div key={campaign.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-bold text-brand-900">
                        {campaign.year}
                      </span>
                      {campaign.isActive ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-800">
                          Активная
                        </span>
                      ) : null}
                    </div>
                    <ul className="mt-2 space-y-2">
                      {(campaign.stages || []).length === 0 ? (
                        <li className="text-sm text-text-muted">Этапы не заданы</li>
                      ) : (
                        (campaign.stages || []).map((stage) => (
                          <li
                            key={stage.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-[#f8fafc] px-3 py-2 text-sm"
                          >
                            <span className="font-semibold text-text-primary">
                              {stage.name}
                            </span>
                            <span className="text-text-secondary">
                              {stage.startsOn} — {stage.endsOn}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}