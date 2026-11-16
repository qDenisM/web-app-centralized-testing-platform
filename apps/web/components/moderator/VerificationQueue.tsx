"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  moderatorStatusLabel,
  waitingLabel,
  type ModeratorQueueResponse,
  type ModeratorVerificationItem,
} from "@/lib/moderator";
import { cn } from "@/lib/utils";

type Tab = "all" | "pending" | "returned" | "rejected";

type VerificationQueueProps = {
  title?: string;
  subtitle?: string;
  initialTab?: Tab;
};

export function VerificationQueue({
  title = "Обзор очереди",
  subtitle = "Проверка паспортов и документов об образовании перед допуском к ЦТ.",
  initialTab = "pending",
}: VerificationQueueProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<ModeratorQueueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ status: tab });
        if (query) params.set("q", query);
        const res = await fetch(
          `/api/applicant/moderator/verifications?${params.toString()}`,
        );
        const json = (await res.json().catch(() => ({}))) as ModeratorQueueResponse & {
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) setError(json.error || "Не удалось загрузить очередь");
          return;
        }
        if (!cancelled) setData(json);
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
  }, [tab, query]);

  const counts = data?.counts;
  const items = data?.items || [];
  const nextFree = items.find(
    (item) => item.status === "pending" && !item.lockedBy,
  );

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
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "Все", counts?.all],
            ["pending", "На проверке", counts?.pending],
            ["returned", "Требуют исправления", counts?.returned],
            ["rejected", "Отказано", counts?.rejected],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-[10px] px-3 py-1.5 text-sm font-semibold",
              tab === key
                ? "bg-brand-700 text-white"
                : "border border-border bg-white text-text-secondary hover:bg-[#f8fafc]",
            )}
          >
            {label}
            {typeof count === "number" ? ` (${count})` : ""}
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
          placeholder="Поиск по ФИО, школе, паспорту"
          className="min-w-[240px] flex-1 rounded-[10px] border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          className="rounded-[10px] border border-border bg-white px-4 py-2.5 text-sm font-bold text-text-secondary hover:bg-[#f8fafc]"
        >
          Найти
        </button>
      </form>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка очереди…</p>
      ) : items.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-white p-8 text-center text-sm text-text-muted">
          В этой вкладке пока пусто.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-[#f8fafc] text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-3 font-bold">Абитуриент</th>
                <th className="px-4 py-3 font-bold">Отправлено</th>
                <th className="px-4 py-3 font-bold">Ожидает</th>
                <th className="px-4 py-3 font-bold">Версия</th>
                <th className="px-4 py-3 font-bold">Кто проверяет</th>
                <th className="px-4 py-3 font-bold">Статус</th>
                <th className="px-4 py-3 font-bold">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <QueueRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function QueueRow({ item }: { item: ModeratorVerificationItem }) {
  const name =
    item.profile.graduateName ||
    `Абитуриент ${item.profile.userId.slice(0, 8)}`;
  const passport =
    item.profile.passportSeries && item.profile.passportNumber
      ? `${item.profile.passportSeries} ${item.profile.passportNumber}`
      : "паспорт не указан";
  const busy = Boolean(item.lockedBy);

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-3">
        <div className="font-semibold text-text-primary">{name}</div>
        <div className="text-xs text-text-muted">{passport}</div>
        {item.profile.attestatAverage != null ? (
          <div className="text-xs text-text-secondary">
            Балл аттестата: {item.profile.attestatAverage}
          </div>
        ) : null}
      </td>
      <td className="px-4 py-3 text-text-secondary">
        {item.submittedAt
          ? new Date(item.submittedAt).toLocaleString("ru-RU")
          : "—"}
      </td>
      <td className="px-4 py-3 text-text-secondary">
        {waitingLabel(item.submittedAt)}
      </td>
      <td className="px-4 py-3 text-text-secondary">v{item.version}</td>
      <td className="px-4 py-3 text-text-secondary">
        {busy ? "Занято" : "Свободно"}
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
      <td className="px-4 py-3">
        {item.status === "pending" ? (
          busy ? (
            <span className="text-sm font-semibold text-text-muted">Занято</span>
          ) : (
            <Link
              href={`/moderator/verifications/${item.id}`}
              className="text-sm font-bold text-brand-700 hover:underline"
            >
              Проверить →
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
