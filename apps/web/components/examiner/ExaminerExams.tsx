"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogSubject } from "@/lib/catalog";
import {
  formatExamVenue,
  formatExamWhenShort,
  type ExamSession,
} from "@/lib/exam";
import {
  type CtResult,
  type ExaminerResultsResponse,
} from "@/lib/results";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";

type ExaminerExamsProps = {
  subjects: CatalogSubject[];
};

type ExamProgress = {
  entered: number;
  total: number;
  pct: number;
  done: boolean;
};

export function ExaminerExams({ subjects }: ExaminerExamsProps) {
  const [exams, setExams] = useState<ExamSession[]>([]);
  const [results, setResults] = useState<CtResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const subjectName = useCallback(
    (subjectId: string) =>
      subjects.find((s) => s.id === subjectId)?.name || "Предмет",
    [subjects],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [examsRes, resultsRes] = await Promise.all([
        fetch("/api/exam/examiner/exams"),
        fetch("/api/results/examiner/results?status=all"),
      ]);
      const examsJson = (await examsRes.json().catch(() => [])) as ExamSession[];
      const resultsJson = (await resultsRes.json().catch(() => ({}))) as
        ExaminerResultsResponse & { error?: string };
      if (!examsRes.ok) {
        setError("Не удалось загрузить экзамены");
        return;
      }
      setExams(Array.isArray(examsJson) ? examsJson : []);
      if (resultsRes.ok) setResults(resultsJson.items || []);
      else setResults([]);
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const progressByExam = useMemo(() => {
    const map = new Map<string, { entered: number; rows: number }>();
    for (const r of results) {
      const cur = map.get(r.examId) || { entered: 0, rows: 0 };
      cur.rows += 1;
      if (r.status !== "missing") cur.entered += 1;
      map.set(r.examId, cur);
    }
    return map;
  }, [results]);

  function progressFor(exam: ExamSession): ExamProgress {
    const stats = progressByExam.get(exam.id);
    const total = Math.max(exam.capacity, exam.seatsTaken, stats?.rows || 0);
    const entered = stats?.entered || 0;
    const pct = total > 0 ? Math.round((entered / total) * 100) : 0;
    return { entered, total, pct, done: total > 0 && entered >= total };
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Экзамены сессии ЦТ 2026
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Выберите пункт и дисциплину для ввода ведомостей с клавиатуры
        </p>
      </div>

      {error ? (
        <Alert>{error}</Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : exams.length === 0 ? (
        <p className="rounded-[14px] border border-border bg-white p-6 text-sm text-text-muted">
          Нет запланированных экзаменов.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {exams.map((exam) => {
            const progress = progressFor(exam);
            const href = `/examiner/exams/${exam.id}`;
            return (
              <article
                key={exam.id}
                className="flex flex-col rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-extrabold text-brand-900">
                    {subjectName(exam.subjectId)}
                  </h2>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold",
                      progress.done
                        ? "bg-green-50 text-green-800"
                        : "bg-[#fff7e6] text-[#ad6800]",
                    )}
                  >
                    {progress.done ? "Завершён" : "В работе"}
                  </span>
                </div>

                <p className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
                  <CalendarIcon />
                  <span>{formatExamWhenShort(exam.startsAt)}</span>
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {formatExamVenue(exam)}
                  {exam.isReserve ? " · резерв" : ""}
                </p>

                <div className="mt-4 space-y-1.5">
                  <p className="text-sm text-text-secondary">
                    Внесено результатов:{" "}
                    <span className="font-semibold text-text-primary">
                      {progress.entered} из {progress.total}
                    </span>
                  </p>
                  <div className="h-2 overflow-hidden rounded-full bg-[#eef2f5]">
                    <div
                      className="h-full rounded-full bg-brand-700 transition-[width]"
                      style={{ width: `${Math.min(100, progress.pct)}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-muted">
                    {progress.pct}% заполнено
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                  <Link
                    href={href}
                    className="text-sm text-text-muted hover:text-text-secondary"
                  >
                    Нажмите для ввода баллов
                  </Link>
                  <Link
                    href={href}
                    className="text-sm font-bold text-brand-700 hover:text-brand-900"
                  >
                    Ведомость →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4 shrink-0 text-text-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <rect x="2" y="3.5" width="12" height="10.5" rx="1.5" />
      <path d="M2 6.5h12M5 2v3M11 2v3" strokeLinecap="round" />
    </svg>
  );
}
