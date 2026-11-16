"use client";

import { useEffect, useState } from "react";
import {
  applicationStatusLabel,
  formatExamWhen,
  type ExamApplication,
} from "@/lib/exam";

export function ExaminerApplicants() {
  const [items, setItems] = useState<ExamApplication[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          "/api/exam/examiner/applications?status=approved",
        );
        const json = (await res.json().catch(() => ({}))) as {
          items?: ExamApplication[];
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) setError(json.error || "Не удалось загрузить список");
          return;
        }
        if (!cancelled) setItems(json.items || []);
      } catch {
        if (!cancelled) setError("Сеть недоступна. Проверьте exam-service.");
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
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Карточки абитуриентов
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Допущенные к ЦТ абитуриенты по одобренным заявкам.
        </p>
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
          Пока нет допущенных абитуриентов.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((row) => (
            <article
              key={row.id}
              className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Абитуриент
              </div>
              <div className="mt-1 text-lg font-bold text-brand-900">
                {row.userId.slice(0, 8)}…
              </div>
              <dl className="mt-4 space-y-2 text-sm text-text-secondary">
                <div className="flex justify-between gap-2">
                  <dt>Статус</dt>
                  <dd className="font-semibold text-text-primary">
                    {applicationStatusLabel(row.status)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Пропуск</dt>
                  <dd className="font-semibold text-text-primary">
                    {row.passNumber || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Сессия</dt>
                  <dd className="text-right font-medium text-text-primary">
                    {row.exam?.startsAt
                      ? formatExamWhen(row.exam.startsAt)
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Пункт</dt>
                  <dd className="text-right font-medium text-text-primary">
                    {row.exam?.venue?.name || "—"}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
