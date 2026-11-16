"use client";

import { useEffect, useState } from "react";
import type { CatalogAdminStats, IdentityAdminStats } from "@/lib/admin";
import { roleLabel } from "@/lib/admin";
import { StatItem } from "@/components/ui/StatItem";

type StatsResponse = {
  identity: IdentityAdminStats;
  catalog: CatalogAdminStats;
};

export function AdminDashboard() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/stats");
        const json = (await res.json().catch(() => ({}))) as StatsResponse & {
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) setError(json.error || "Не удалось загрузить статистику");
          return;
        }
        if (!cancelled) setData(json);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Дашборд
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Сводные счётчики из PostgreSQL по identity и catalog.
        </p>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : !data && !error ? (
        <p className="rounded-[14px] border border-border bg-white p-6 text-sm text-text-muted">
          Нет данных для отображения.
        </p>
      ) : data ? (
        <>
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
            <RoleBadges
              className="mt-4 flex flex-wrap gap-2 text-xs text-text-secondary"
              items={Object.entries(data.identity.byRole)}
            />
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
        </>
      ) : null}
    </div>
  );
}

function RoleBadges({
  className,
  items,
}: {
  className?: string;
  items: [string, number][];
}) {
  return (
    <div className={className}>
      {items.map(([role, count]) => (
        <span
          key={role}
          className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-800"
        >
          {roleLabel(role)}: {count}
        </span>
      ))}
    </div>
  );
}