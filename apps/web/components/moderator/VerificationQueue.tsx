"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FilterSelect } from "@/components/ui/FilterSelect";
import type { ExamApplication } from "@/lib/exam";
import {
  applicantDisplayName,
  formatSubmittedAt,
  isResubmission,
  moderatorStatusLabel,
  waitingLabel,
  type ModeratorQueueResponse,
  type ModeratorVerificationItem,
} from "@/lib/moderator";
import { cn } from "@/lib/utils";

type Tab = "all" | "pending" | "returned" | "unverified";

type VerificationQueueProps = {
  title?: string;
  subtitle?: string;
  initialTab?: Tab;
};

const PAGE_SIZE = 10;

export function VerificationQueue({
  title = "Очередь проверки персональных данных",
  subtitle = "Верификация паспортов и документов об образовании перед допуском к ЦТ",
  initialTab = "all",
}: VerificationQueueProps) {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const filterParam = searchParams.get("filter");

  const bootTab: Tab =
    statusParam === "pending" ||
    statusParam === "returned" ||
    statusParam === "all" ||
    statusParam === "unverified"
      ? statusParam
      : initialTab;

  const [tab, setTab] = useState<Tab>(bootTab);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [resubmitOnly, setResubmitOnly] = useState(
    filterParam === "resubmit",
  );
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ModeratorQueueResponse | null>(null);
  const [ctApps, setCtApps] = useState<ExamApplication[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [docsRes, ctRes, meRes] = await Promise.all([
          fetch("/api/applicant/moderator/verifications?status=all"),
          fetch("/api/exam/moderator/applications?status=pending"),
          fetch("/api/users/me"),
        ]);
        const docsJson = (await docsRes.json().catch(() => ({}))) as
          ModeratorQueueResponse & { error?: string };
        const ctJson = (await ctRes.json().catch(() => ({}))) as {
          items?: ExamApplication[];
          error?: string;
        };
        const meJson = (await meRes.json().catch(() => null)) as {
          id?: string;
          error?: string;
        } | null;

        if (!docsRes.ok) {
          if (!cancelled) {
            setError(docsJson.error || "Не удалось загрузить очередь");
          }
          return;
        }
        if (!cancelled) {
          setData(docsJson);
          if (ctRes.ok && Array.isArray(ctJson.items)) {
            setCtApps(ctJson.items);
          }
          if (meRes.ok && meJson?.id) {
            setMeId(meJson.id);
          }
        }
      } catch {
        if (!cancelled) {
          setError("Сеть недоступна. Проверьте applicant-service.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const ctWaitingByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const app of ctApps) {
      map.set(app.userId, (map.get(app.userId) || 0) + 1);
    }
    return map;
  }, [ctApps]);

  const allItems = data?.items ?? [];

  const tabCounts = useMemo(() => {
    const pending = allItems.filter((item) => item.status === "pending");
    return {
      all: allItems.length,
      pending: pending.length,
      returned: allItems.filter((item) => item.status === "returned").length,
      unverified: pending.filter((item) => !item.lockedBy).length,
    };
  }, [allItems]);

  const filtered = useMemo(() => {
    let rows = allItems;

    if (tab === "pending") {
      rows = rows.filter((item) => item.status === "pending");
    } else if (tab === "returned") {
      rows = rows.filter((item) => item.status === "returned");
    } else if (tab === "unverified") {
      rows = rows.filter(
        (item) => item.status === "pending" && !item.lockedBy,
      );
    }

    if (resubmitOnly) {
      rows = rows.filter(isResubmission);
    }

    if (query) {
      const needle = query.toLowerCase();
      rows = rows.filter((item) => {
        const hay = [
          item.profile.graduateName,
          item.profile.passportSeries,
          item.profile.passportNumber,
          item.profile.userId,
          item.profile.schoolName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });
    }

    return rows;
  }, [allItems, tab, resubmitOnly, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const rangeFrom = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(safePage * PAGE_SIZE, filtered.length);

  const nextFree = allItems.find(
    (item) => item.status === "pending" && !item.lockedBy,
  );

  useEffect(() => {
    setPage(1);
  }, [tab, query, resubmitOnly]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            {title}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
        </div>
        {nextFree ? (
          <Link
            href={`/moderator/verifications/${nextFree.id}`}
            className="inline-flex rounded-[10px] bg-brand-700 px-4 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-soft)] hover:bg-brand-800"
          >
            Взять следующую из очереди
          </Link>
        ) : (
          <span className="inline-flex cursor-not-allowed rounded-[10px] bg-brand-500/50 px-4 py-2.5 text-sm font-bold text-white">
            Взять следующую из очереди
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "Все", tabCounts.all],
            ["pending", "На проверке", tabCounts.pending],
            ["returned", "Требуют исправления", tabCounts.returned],
            ["unverified", "Не проверены", tabCounts.unverified],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-[10px] px-3 py-1.5 text-sm font-semibold",
              tab === key
                ? "bg-brand-100 text-brand-900"
                : "border border-border bg-white text-text-secondary hover:bg-[#f8fafc]",
            )}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      <form
        className="rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
        }}
      >
        <div className="flex flex-wrap gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по ФИО, email, серии / номеру паспорта..."
            className="min-w-[240px] flex-1 rounded-[10px] border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <FilterSelect
            className="min-w-[260px] sm:w-72"
            value={resubmitOnly ? "resubmit" : "all"}
            onChange={(e) => setResubmitOnly(e.target.value === "resubmit")}
            aria-label="Фильтр повторной отправки"
          >
            <option value="all">Все отправки</option>
            <option value="resubmit">Повторная отправка после исправления</option>
          </FilterSelect>
          <button
            type="submit"
            className="rounded-[10px] border border-border bg-white px-4 py-2.5 text-sm font-bold text-text-secondary hover:bg-[#f8fafc]"
          >
            Найти
          </button>
        </div>
      </form>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка очереди…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-white p-8 text-center text-sm text-text-muted">
          В этой вкладке пока пусто.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-[#f8fafc] text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-bold">Абитуриент</th>
                  <th className="px-4 py-3 font-bold">Отправлено</th>
                  <th className="px-4 py-3 font-bold">Ожидает</th>
                  <th className="px-4 py-3 font-bold">Версия</th>
                  <th className="px-4 py-3 font-bold">Кто проверяет</th>
                  <th className="px-4 py-3 font-bold">Статус данных</th>
                  <th className="px-4 py-3 font-bold">Ждут ЦТ</th>
                  <th className="px-4 py-3 font-bold">Действия</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => (
                  <QueueRow
                    key={item.id}
                    item={item}
                    meId={meId}
                    ctWaiting={ctWaitingByUser.get(item.profile.userId) || 0}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
            <p className="text-text-muted">
              Показано {rangeFrom}–{rangeTo} из {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-[8px] border border-border px-3 py-1.5 text-sm font-semibold text-text-secondary disabled:opacity-40"
              >
                Пред
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(
                  Math.max(0, safePage - 3),
                  Math.max(0, safePage - 3) + 5,
                )
                .map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPage(num)}
                    className={cn(
                      "min-w-9 rounded-[8px] px-2.5 py-1.5 text-sm font-bold",
                      num === safePage
                        ? "bg-brand-700 text-white"
                        : "border border-border text-text-secondary hover:bg-[#f8fafc]",
                    )}
                  >
                    {num}
                  </button>
                ))}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-[8px] border border-border px-3 py-1.5 text-sm font-semibold text-text-secondary disabled:opacity-40"
              >
                След
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QueueRow({
  item,
  meId,
  ctWaiting,
}: {
  item: ModeratorVerificationItem;
  meId: string | null;
  ctWaiting: number;
}) {
  const name = applicantDisplayName(item);
  const secondary =
    item.profile.passportSeries && item.profile.passportNumber
      ? `${item.profile.passportSeries} ${item.profile.passportNumber}`
      : `ID ${item.profile.userId.slice(0, 8)}…`;
  const lockedByMe = Boolean(meId && item.lockedBy === meId);
  // Only treat as busy when we know another moderator holds the lock.
  const lockedByOther = Boolean(
    meId && item.lockedBy && item.lockedBy !== meId,
  );
  const versionPrimary = `${item.version}-я отправка`;

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-3">
        <div className="font-semibold text-text-primary">{name}</div>
        <div className="text-xs text-text-muted">{secondary}</div>
      </td>
      <td className="px-4 py-3 text-text-secondary">
        {formatSubmittedAt(item.submittedAt)}
      </td>
      <td className="px-4 py-3 text-text-secondary">
        {waitingLabel(item.submittedAt)}
      </td>
      <td className="px-4 py-3 text-text-secondary">
        <div>{versionPrimary}</div>
        {item.version > 1 ? (
          <div className="text-xs text-[#9A6B00]">После исправления</div>
        ) : null}
      </td>
      <td className="px-4 py-3 text-text-secondary">
        {lockedByMe ? (
          <span title={item.lockedBy || undefined}>Вы</span>
        ) : item.lockedBy ? (
          <span title={item.lockedBy}>
            Мод. {item.lockedBy.slice(0, 8)}…
          </span>
        ) : (
          "Свободно"
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
            item.status === "pending" && "bg-brand-100 text-brand-900",
            item.status === "returned" && "bg-[#FFF4D6] text-[#9A6B00]",
            item.status === "rejected" && "bg-red-50 text-red-700",
            item.status === "approved" && "bg-green-50 text-green-800",
          )}
        >
          {moderatorStatusLabel(item.status)}
        </span>
      </td>
      <td className="px-4 py-3 font-semibold text-text-primary">{ctWaiting}</td>
      <td className="px-4 py-3">
        {item.status === "pending" ? (
          lockedByOther ? (
            <span className="text-sm font-semibold text-text-muted">Занято</span>
          ) : (
            <Link
              href={`/moderator/verifications/${item.id}`}
              className="text-sm font-bold text-brand-700 hover:underline"
            >
              {lockedByMe ? "Продолжить →" : "Проверить →"}
            </Link>
          )
        ) : (
          <Link
            href={`/moderator/verifications/${item.id}`}
            className="text-sm font-semibold text-text-secondary hover:underline"
          >
            Открыть
          </Link>
        )}
      </td>
    </tr>
  );
}
