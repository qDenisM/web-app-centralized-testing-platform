"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogSubject } from "@/lib/catalog";
import {
  formatExamWhen,
  type ExamApplication,
  type ExamSession,
} from "@/lib/exam";
import { resultStatusLabel, shortUserId, type CtResult } from "@/lib/results";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { FormButton } from "@/components/ui/FormButton";

type ExaminerExamsProps = {
  subjects: CatalogSubject[];
};

export function ExaminerExams({ subjects }: ExaminerExamsProps) {
  const [exams, setExams] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rosterExamId, setRosterExamId] = useState<string | null>(null);
  const [rosterApps, setRosterApps] = useState<ExamApplication[]>([]);
  const [rosterResults, setRosterResults] = useState<CtResult[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const subjectName = useCallback(
    (subjectId: string) =>
      subjects.find((s) => s.id === subjectId)?.name || "Предмет",
    [subjects],
  );

  const loadExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/exam/examiner/exams");
      const json = (await res.json().catch(() => [])) as ExamSession[];
      if (!res.ok) {
        setError("Не удалось загрузить экзамены");
        return;
      }
      setExams(Array.isArray(json) ? json : []);
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  const rosterExam = useMemo(
    () => exams.find((e) => e.id === rosterExamId) || null,
    [exams, rosterExamId],
  );

  async function openRoster(examId: string) {
    setRosterExamId(examId);
    setRosterLoading(true);
    setRosterApps([]);
    setRosterResults([]);
    try {
      await fetch("/api/results/examiner/results/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId }),
      });
      const [appsRes, resultsRes] = await Promise.all([
        fetch(`/api/exam/examiner/applications?status=approved&examId=${encodeURIComponent(examId)}`),
        fetch(`/api/results/examiner/results?status=all&examId=${encodeURIComponent(examId)}`),
      ]);
      const appsJson = (await appsRes.json().catch(() => ({}))) as { items?: ExamApplication[] };
      const resultsJson = (await resultsRes.json().catch(() => ({}))) as { items?: CtResult[] };
      if (appsRes.ok) setRosterApps(appsJson.items || []);
      if (resultsRes.ok) setRosterResults(resultsJson.items || []);
    } finally {
      setRosterLoading(false);
    }
  }

  const rosterRows = useMemo(() => {
    const byUser = new Map<string, CtResult>();
    for (const r of rosterResults) byUser.set(r.userId, r);
    return rosterApps.map((app) => ({
      app,
      result: byUser.get(app.userId) || null,
    }));
  }, [rosterApps, rosterResults]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Экзамены сессии ЦТ 2026
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Сеансы централизованного тестирования и ведомости по пунктам.
        </p>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : exams.length === 0 ? (
        <p className="rounded-[14px] border border-border bg-white p-6 text-sm text-text-muted">
          Нет запланированных экзаменов.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => (
            <article
              key={exam.id}
              className="flex flex-col rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]"
            >
              <div className="text-xs font-bold uppercase tracking-wide text-text-muted">
                {exam.venue?.city || "Беларусь"}
              </div>
              <h2 className="mt-1 text-lg font-extrabold text-brand-900">
                {subjectName(exam.subjectId)}
              </h2>
              <p className="mt-2 text-sm text-text-secondary">{formatExamWhen(exam.startsAt)}</p>
              <p className="text-sm text-text-muted">
                {exam.venue?.name || "Пункт не указан"}
              </p>
              <p className="mt-2 text-xs text-text-muted">
                Мест: {exam.seatsTaken}/{exam.capacity}
                {exam.isReserve ? " · резерв" : ""}
              </p>
              <div className="mt-4 flex-1" />
              <button
                type="button"
                onClick={() => void openRoster(exam.id)}
                className="text-left text-sm font-bold text-brand-700 hover:text-brand-900"
              >
                Ведомость →
              </button>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={rosterExamId !== null}
        onClose={() => setRosterExamId(null)}
        title={
          rosterExam
            ? `Ведомость · ${subjectName(rosterExam.subjectId)}`
            : "Ведомость экзамена"
        }
        size="lg"
        footer={
          <FormButton
            type="button"
            variant="secondary"
            className="w-auto px-4 py-2.5"
            onClick={() => setRosterExamId(null)}
          >
            Закрыть
          </FormButton>
        }
      >
        {rosterExam ? (
          <p className="mb-4 text-sm text-text-secondary">
            {formatExamWhen(rosterExam.startsAt)} · {rosterExam.venue?.name || "—"}
          </p>
        ) : null}
        {rosterLoading ? (
          <p className="text-sm text-text-muted">Загрузка ведомости…</p>
        ) : rosterRows.length === 0 ? (
          <p className="text-sm text-text-muted">Нет допущенных абитуриентов.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs font-bold uppercase text-text-muted">
                <tr>
                  <th className="px-2 py-2">Абитуриент</th>
                  <th className="px-2 py-2">Пропуск</th>
                  <th className="px-2 py-2">Явка</th>
                  <th className="px-2 py-2">Балл</th>
                  <th className="px-2 py-2">Статус</th>
                </tr>
              </thead>
              <tbody>
                {rosterRows.map(({ app, result }) => (
                  <tr key={app.id} className="border-b border-border">
                    <td className="px-2 py-2 font-semibold">
                      {shortUserId(app.userId)}
                    </td>
                    <td className="px-2 py-2">{app.passNumber || "—"}</td>
                    <td className="px-2 py-2">
                      {result?.status === "absent" ? "Неявка" : "Явился"}
                    </td>
                    <td className="px-2 py-2 font-bold tabular-nums">
                      {result?.status === "absent" ? "—" : (result?.score ?? "—")}
                    </td>
                    <td className="px-2 py-2">
                      <RosterStatus status={result?.status || "missing"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}

function RosterStatus({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-bold",
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