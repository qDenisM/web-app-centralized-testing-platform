"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  moderatorStatusLabel,
  type ModeratorVerificationItem,
} from "@/lib/moderator";
import { cn } from "@/lib/utils";
import { FormButton } from "@/components/ui/FormButton";

type StatusFilter = "all" | "approved" | "returned" | "rejected";

export function ModeratorDecisionHistory() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ModeratorVerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const statuses: StatusFilter[] =
          status === "all"
            ? ["approved", "returned", "rejected"]
            : [status];
        const batches = await Promise.all(
          statuses.map(async (st) => {
            const params = new URLSearchParams({ status: st });
            if (query) params.set("q", query);
            const res = await fetch(
              `/api/applicant/moderator/verifications?${params.toString()}`,
            );
            const json = (await res.json().catch(() => ({}))) as {
              items?: ModeratorVerificationItem[];
              error?: string;
            };
            if (!res.ok) throw new Error(json.error || "Ошибка загрузки");
            return json.items || [];
          }),
        );
        if (cancelled) return;
        const merged = batches
          .flat()
          .filter((item) => item.decidedAt)
          .sort(
            (a, b) =>
              new Date(b.decidedAt || 0).getTime() -
              new Date(a.decidedAt || 0).getTime(),
          );
        setItems(merged);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Не удалось загрузить журнал",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [status, query]);

  const filtered = useMemo(() => items, [items]);

  function exportCsv() {
    const header = [
      "Абитуриент",
      "Решение",
      "Дата решения",
      "Комментарий",
      "Версия",
    ];
    const rows = filtered.map((item) => {
      const name =
        item.profile.graduateName ||
        `Абитуриент ${item.profile.userId.slice(0, 8)}`;
      return [
        name,
        moderatorStatusLabel(item.status),
        item.decidedAt
          ? new Date(item.decidedAt).toLocaleString("ru-RU")
          : "",
        item.rejectReason || "",
        `v${item.version}`,
      ];
    });
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `moderator-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Журнал решений модератора
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            История одобрений, возвратов и отказов по анкетам абитуриентов.
          </p>
        </div>
        <FormButton
          type="button"
          variant="secondary"
          className="w-auto px-4 py-2.5"
          onClick={exportCsv}
          disabled={filtered.length === 0}
        >
          Экспорт CSV
        </FormButton>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "Все решения"],
            ["approved", "Подтверждено"],
            ["returned", "На исправлении"],
            ["rejected", "Отказано"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatus(key)}
            className={cn(
              "rounded-[10px] px-3 py-1.5 text-sm font-semibold",
              status === key
                ? "bg-brand-700 text-white"
                : "border border-border bg-white text-text-secondary hover:bg-[#f8fafc]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ФИО, школа, паспорт"
          className="min-w-[240px] flex-1 rounded-[10px] border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <FormButton type="submit" variant="secondary" className="w-auto px-4 py-2.5">
          Применить фильтр
        </FormButton>
      </form>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка журнала…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-white p-8 text-center text-sm text-text-muted">
          Записей не найдено.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-[#f8fafc] text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-3 font-bold">Абитуриент</th>
                <th className="px-4 py-3 font-bold">Решение</th>
                <th className="px-4 py-3 font-bold">Дата</th>
                <th className="px-4 py-3 font-bold">Комментарий</th>
                <th className="px-4 py-3 font-bold" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const name =
                  item.profile.graduateName ||
                  `Абитуриент ${item.profile.userId.slice(0, 8)}`;
                return (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold text-text-primary">
                      {name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                          item.status === "approved" && "bg-green-50 text-green-800",
                          item.status === "returned" && "bg-[#FFF4D6] text-[#9A6B00]",
                          item.status === "rejected" && "bg-red-50 text-red-700",
                        )}
                      >
                        {moderatorStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {item.decidedAt
                        ? new Date(item.decidedAt).toLocaleString("ru-RU")
                        : "—"}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-text-secondary">
                      {item.rejectReason || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/moderator/verifications/${item.id}`}
                        className="text-sm font-bold text-brand-700 hover:underline"
                      >
                        Открыть
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}