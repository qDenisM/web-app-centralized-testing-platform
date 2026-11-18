"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type ExamApplicantBrief,
  type ExamApplication,
} from "@/lib/exam";
import {
  shortUserId,
  type CtResult,
  type ExaminerResultsResponse,
} from "@/lib/results";
import type { CatalogSubject } from "@/lib/catalog";
import { Alert } from "@/components/ui/Alert";
import { ResultStatusBadge } from "@/components/ui/StatusBadge";

type ExaminerApplicantsProps = {
  subjects: CatalogSubject[];
};

type ApplicantGroup = {
  userId: string;
  apps: ExamApplication[];
  results: CtResult[];
  meta: ExamApplicantBrief | null;
};

type IdentityUser = {
  id: string;
  email: string;
  fullName: string;
};

export function ExaminerApplicants({ subjects }: ExaminerApplicantsProps) {
  const [apps, setApps] = useState<ExamApplication[]>([]);
  const [results, setResults] = useState<CtResult[]>([]);
  const [identityById, setIdentityById] = useState<Record<string, IdentityUser>>(
    {},
  );
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
        await fetch("/api/results/examiner/results/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

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
          if (!cancelled) {
            setError(appsJson.error || "Не удалось загрузить список");
          }
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
      const g = map.get(app.userId) || {
        userId: app.userId,
        apps: [],
        results: [],
        meta: app.applicant || null,
      };
      g.apps.push(app);
      if (!g.meta && app.applicant) g.meta = app.applicant;
      map.set(app.userId, g);
    }
    for (const r of results) {
      const g = map.get(r.userId);
      if (g) g.results.push(r);
    }
    return [...map.values()];
  }, [apps, results]);

  const lookedUpRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const ids = new Set<string>();
    for (const r of results) {
      if (r.enteredBy) ids.add(r.enteredBy);
    }
    const missing = [...ids].filter((id) => !lookedUpRef.current.has(id));
    if (missing.length === 0) return;

    for (const id of missing) lookedUpRef.current.add(id);

    let cancelled = false;
    async function lookup() {
      try {
        const res = await fetch("/api/exam/examiner/users/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: missing }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          users?: IdentityUser[];
        };
        if (!res.ok || cancelled) return;
        setIdentityById((prev) => {
          const next = { ...prev };
          for (const user of json.users || []) {
            if (user?.id) next[user.id] = user;
          }
          return next;
        });
      } catch {
        // Identity enrichment is optional.
      }
    }
    void lookup();
    return () => {
      cancelled = true;
    };
  }, [results]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      const pass = g.apps.map((a) => a.passNumber || "").join(" ");
      const name = applicantDisplayName(g.userId, g.meta);
      const email = g.meta?.email || "";
      return `${name} ${email} ${g.userId} ${pass}`.toLowerCase().includes(q);
    });
  }, [groups, search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Карточки абитуриентов
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Сводная ведомость сдаваемых ЦТ участника и сумма баллов
        </p>
      </div>

      <div className="relative w-full max-w-xl">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-text-muted">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по ФИО, номеру пропуска (например: Ковалев)…"
          aria-label="Поиск по ФИО или номеру пропуска"
          className="w-full rounded-[10px] border border-border bg-white py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {error ? (
        <Alert>{error}</Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-[14px] border border-border bg-white p-6 text-sm text-text-muted">
          Пока нет допущенных абитуриентов.
        </p>
      ) : (
        <div className="space-y-8">
          {filtered.map((group) => (
            <ApplicantCard
              key={group.userId}
              group={group}
              subjectName={subjectName}
              identityById={identityById}
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
  identityById,
}: {
  group: ApplicantGroup;
  subjectName: (id: string) => string;
  identityById: Record<string, IdentityUser>;
}) {
  const primary = group.apps[0];
  const pass = primary?.passNumber || "—";
  const city = primary?.exam?.venue?.city || "—";
  const email = group.meta?.email?.trim() || null;
  const attestat = group.meta?.attestatAverage;

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

  const title = applicantDisplayName(group.userId, group.meta);
  const metaParts = [`Пропуск: ${pass}`, email, city].filter(Boolean);

  return (
    <div className="space-y-4">
      <article className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-brand-900">{title}</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {metaParts.join(" • ")}
            </p>
            {typeof attestat === "number" ? (
              <span className="mt-3 inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-800">
                Аттестат: {formatAttestat(attestat)}
              </span>
            ) : null}
          </div>
          <div className="rounded-[12px] border border-brand-200 bg-brand-50 px-4 py-3 text-right">
            <div className="text-xs font-bold uppercase tracking-wide text-brand-700">
              Сумма ЦТ
            </div>
            <div className="text-2xl font-extrabold tabular-nums text-brand-900">
              {sum}
              <span className="text-sm font-semibold text-text-muted"> / 300</span>
            </div>
            <p className="text-xs font-medium text-brand-700">
              {publishedLabel(published.length)}
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Сдаваемые экзамены ЦТ участника
          </h3>
          <Link
            href="/examiner"
            className="inline-flex w-auto items-center justify-center rounded-[10px] bg-brand-700 px-4 py-2 text-sm font-bold text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-brand-800"
          >
            Добавить результат
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-xs font-bold uppercase text-text-muted">
              <tr>
                <th className="px-2 py-2">Предмет</th>
                <th className="px-2 py-2">Дата сдачи</th>
                <th className="px-2 py-2">Балл (0–100)</th>
                <th className="px-2 py-2">Статус</th>
                <th className="px-2 py-2">Кто внёс</th>
                <th className="px-2 py-2">Действие</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ app, result, subjectId }) => (
                <tr
                  key={app.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-2 py-3 font-semibold text-brand-900">
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
                    <ResultStatusBadge status={result?.status || "missing"} />
                  </td>
                  <td className="px-2 py-3 text-sm text-text-secondary">
                    {enteredByLabel(result?.enteredBy, identityById)}
                  </td>
                  <td className="px-2 py-3">
                    <Link
                      href="/examiner"
                      className="inline-flex rounded-[8px] border border-border bg-white px-3 py-1 text-xs font-bold text-brand-700 transition-colors hover:bg-[#f8fafc]"
                    >
                      Изменить
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

function applicantDisplayName(
  userId: string,
  meta: ExamApplicantBrief | null | undefined,
): string {
  const name = meta?.fullName?.trim();
  if (name && name.length >= 2) return name;
  const email = meta?.email?.trim();
  if (email) return email;
  return `Абитуриент ${userId.slice(0, 8)}…`;
}

function enteredByLabel(
  enteredBy: string | null | undefined,
  identityById: Record<string, IdentityUser>,
): string {
  if (!enteredBy) return "—";
  const fullName = identityById[enteredBy]?.fullName?.trim();
  if (fullName) return shortFio(fullName);
  return shortUserId(enteredBy);
}

function shortFio(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fullName;
  if (parts.length === 1) return parts[0];
  const [last, first, middle] = parts;
  const initials = [first, middle]
    .filter(Boolean)
    .map((p) => `${p[0]?.toUpperCase()}.`)
    .join(" ");
  return `${last} ${initials}`.trim();
}

function formatAttestat(avg: number): string {
  const formatted = Number.isInteger(avg) ? String(avg) : avg.toFixed(1);
  const word = attestatWord(avg);
  return `${formatted} ${word}`;
}

function attestatWord(avg: number): string {
  if (!Number.isInteger(avg)) return "балла";
  const n = Math.abs(avg);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "балл";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "балла";
  return "баллов";
}

function publishedLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} экзамен опубликован`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${n} экзамена опубликованы`;
  }
  return `${n} экзаменов опубликовано`;
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M8.75 14.5a5.75 5.75 0 1 1 0-11.5 5.75 5.75 0 0 1 0 11.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M13.1 13.1 16.5 16.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
