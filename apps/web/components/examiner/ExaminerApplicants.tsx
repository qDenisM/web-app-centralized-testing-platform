"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type ExamApplication } from "@/lib/exam";
import {
  resultStatusLabel,
  shortUserId,
  type CtResult,
  type ExaminerResultsResponse,
} from "@/lib/results";
import { cn } from "@/lib/utils";
import type { CatalogSubject } from "@/lib/catalog";

type ExaminerApplicantsProps = {
  subjects: CatalogSubject[];
};

type ApplicantGroup = {
  userId: string;
  apps: ExamApplication[];
  results: CtResult[];
};

export function ExaminerApplicants({ subjects }: ExaminerApplicantsProps) {
  const [apps, setApps] = useState<ExamApplication[]>([]);
  const [results, setResults] = useState<CtResult[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const subjectName = useCallback(
    (subjectId: string) =>
      subjects.find((s) => s.id === subjectId)?.name || "Предмет",
    [subjects],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [appsRes, resultsRes] = await Promise.all([
          fetch("/api/exam/examiner/applications?status=approved"),
          fetch("/api/results/examiner/results?status=all"),
        ]);
        const appsJson = (await appsRes.json().catch(() => ({}))) as {
          items?: ExamApplication[];
          error?: string;
        };
        const resultsJson = (await resultsRes.json().catch(() => ({}))) as
          ExaminerResultsResponse & { error?: string };
        if (!appsRes.ok) {
          if (!cancelled) setError(appsJson.error || "Не удалось загрузить список");
          return;
        }
        if (!cancelled) {
          setApps(appsJson.items || []);
          setResults(resultsJson.items || []);
        }
      } catch {
        if (!cancelled) setError("Сеть недоступна.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, ApplicantGroup>();
    for (const app of apps) {
      const g = map.get(app.userId) || { userId: app.userId, apps: [], results: [] };
      g.apps.push(app);
      map.set(app.userId, g);
    }
    for (const r of results) {
      const g = map.get(r.userId);
      if (g) g.results.push(r);
    }
    return [...map.values()];
  }, [apps, results]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      const pass = g.apps.map((a) => a.passNumber || "").join(" ");
      return `${g.userId} ${pass}`.toLowerCase().includes(q);
    });
  }, [groups, search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Карточки абитуриентов
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Сводная ведомость сдаваемых ЦТ участника и сумма баллов.
        </p>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск по ФИО, номеру пропуска (например: Коваленко)…"
        className="w-full max-w-xl rounded-[10px] border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-[14px] border border-border bg-white p-6 text-sm text-text-muted">
          Пока нет допущенных абитуриентов.
        </p>
      ) : (
        <div className="space-y-6">
          {filtered.map((group) => (
            <ApplicantCard
              key={group.userId}
              group={group}
              subjectName={subjectName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicantCard({
  group,
  subjectName,
}: {
  group: ApplicantGroup;
  subjectName: (id: string) => string;
}) {
  const primary = group.apps[0];
  const pass = primary?.passNumber || "—";
  const city = primary?.exam?.venue?.city || "—";

  const published = group.results.filter((r) => r.status === "published");
  const sum = published.reduce((acc, r) => acc + (r.score ?? 0), 0);

  const rows = useMemo(() => {
    return group.apps.map((app) => {
      const result =
        group.results.find((r) => r.examId === app.examId) || null;
      const subjectId = app.exam?.subjectId || "";
      return { app, result, subjectId };
    });
  }, [group]);

  const title = `Участник ${shortUserId(group.userId)}`;

  return (
    <article className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-brand-900">{title}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Пропуск: <span className="font-semibold text-text-primary">{pass}</span>
            {" · "}
            {city}
          </p>
        </div>
        <div className="rounded-[12px] border border-brand-200 bg-brand-50 px-4 py-3 text-right">
          <div className="text-xs font-bold uppercase tracking-wide text-brand-700">
            Сумма ЦТ
          </div>
          <div className="text-2xl font-extrabold tabular-nums text-brand-900">
            {sum}
            <span className="text-sm font-semibold text-text-muted"> / 300</span>
          </div>
          <p className="text-xs text-text-muted">
            {published.length} экзамен(ов) опубликовано
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-text-muted">
          Сдаваемые экзамены ЦТ участника
        </h3>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-xs font-bold uppercase text-text-muted">
            <tr>
              <th className="px-2 py-2">Предмет</th>
              <th className="px-2 py-2">Дата сдачи</th>
              <th className="px-2 py-2">Балл (0–100)</th>
              <th className="px-2 py-2">Статус</th>
              <th className="px-2 py-2">Кто внёс</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ app, result, subjectId }) => (
              <tr key={app.id} className="border-b border-border last:border-b-0">
                <td className="px-2 py-3 font-semibold">
                  {subjectId ? subjectName(subjectId) : "—"}
                </td>
                <td className="px-2 py-3 text-text-secondary">
                  {app.exam?.startsAt
                    ? new Date(app.exam.startsAt).toLocaleDateString("ru-RU")
                    : "—"}
                </td>
                <td className="px-2 py-3 text-lg font-extrabold tabular-nums text-brand-900">
                  {result?.status === "absent" ? "—" : (result?.score ?? "—")}
                </td>
                <td className="px-2 py-3">
                  {result ? <StatusPill status={result.status} /> : "—"}
                </td>
                <td className="px-2 py-3 text-xs text-text-muted">
                  {result?.enteredBy ? shortUserId(result.enteredBy) : "—"}
                </td>
                <td className="px-2 py-3">
                  <button
                    type="button"
                    className="rounded-[8px] border border-border px-3 py-1 text-xs font-bold text-brand-700"
                    onClick={() => {
                      window.location.href = "/examiner";
                    }}
                  >
                    Изменить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
        status === "published" && "bg-green-50 text-green-800",
        status === "draft" && "bg-[#fff7e6] text-[#ad6800]",
        status === "missing" && "bg-[#f0f5ff] text-[#1d39c4]",
        status === "absent" && "bg-red-50 text-red-700",
      )}
    >
      {resultStatusLabel(status)}
    </span>
  );
}