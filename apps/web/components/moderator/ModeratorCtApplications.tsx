"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applicationStatusLabel,
  formatExamWhen,
  type ExamApplication,
} from "@/lib/exam";
import { cn } from "@/lib/utils";
import { FormButton } from "@/components/ui/FormButton";

type Tab = "pending" | "approved" | "rejected" | "all";

type QueueResponse = {
  items: ExamApplication[];
  counts: {
    all: number;
    pending: number;
    approved: number;
    rejected: number;
  };
};

export function ModeratorCtApplications() {
  const [tab, setTab] = useState<Tab>("pending");
  const [data, setData] = useState<QueueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/exam/moderator/applications?status=${tab}`,
      );
      const json = (await res.json().catch(() => ({}))) as QueueResponse & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "Не удалось загрузить заявки");
        return;
      }
      setData(json);
      setSelected(new Set());
    } catch {
      setError("Сеть недоступна. Проверьте exam-service.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = data?.items || [];
  const counts = data?.counts;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function decide(id: string, decision: "approved" | "rejected") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/exam/moderator/applications/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reason: decision === "rejected" ? "Не соответствует требованиям" : undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось принять решение");
        return;
      }
      await load();
    } catch {
      setError("Ошибка сети при решении по заявке");
    } finally {
      setBusy(false);
    }
  }

  async function approveBatch() {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/exam/moderator/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось одобрить пакетно");
        return;
      }
      await load();
    } catch {
      setError("Ошибка сети при пакетном одобрении");
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "pending", label: "Ожидают", count: counts?.pending },
    { id: "approved", label: "Одобрены", count: counts?.approved },
    { id: "rejected", label: "Отклонены", count: counts?.rejected },
    { id: "all", label: "Все", count: counts?.all },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Заявки абитуриентов на сдачу ЦТ
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Подтверждение записи на сессии централизованного тестирования.
          </p>
        </div>
        {tab === "pending" && selected.size > 0 ? (
          <FormButton
            type="button"
            className="w-auto"
            onClick={() => void approveBatch()}
            disabled={busy}
          >
            Одобрить выбранные ({selected.size})
          </FormButton>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-[10px] px-3.5 py-2 text-sm font-semibold",
              tab === item.id
                ? "bg-brand-100 text-brand-900"
                : "bg-white text-text-secondary border border-border",
            )}
          >
            {item.label}
            {typeof item.count === "number" ? ` · ${item.count}` : ""}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="rounded-[14px] border border-border bg-white p-6 text-sm text-text-muted">
          Заявок в этом статусе нет.
        </p>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-[#f8fafc] text-xs uppercase tracking-wide text-text-muted">
              <tr>
                {tab === "pending" ? <th className="px-4 py-3 w-10" /> : null}
                <th className="px-4 py-3">Абитуриент</th>
                <th className="px-4 py-3">Сессия</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  {tab === "pending" ? (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                        aria-label="Выбрать заявку"
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {row.userId.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {row.exam?.startsAt
                      ? formatExamWhen(row.exam.startsAt)
                      : row.examId.slice(0, 8)}
                    {row.exam?.venue?.name ? ` · ${row.exam.venue.name}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    {applicationStatusLabel(row.status)}
                    {row.passNumber ? ` · ${row.passNumber}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "pending" ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void decide(row.id, "approved")}
                          className="rounded-[8px] bg-brand-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-800 disabled:opacity-60"
                        >
                          Одобрить
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void decide(row.id, "rejected")}
                          className="rounded-[8px] border border-border px-3 py-1.5 text-xs font-bold text-text-secondary hover:bg-[#f8fafc] disabled:opacity-60"
                        >
                          Отклонить
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
