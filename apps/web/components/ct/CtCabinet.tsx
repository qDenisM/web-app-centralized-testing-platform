"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogSubject } from "@/lib/catalog";
import {
  applicationStatusLabel,
  formatExamWhen,
  type ExamApplication,
  type ExamSession,
  type ExamWaitlistEntry,
} from "@/lib/exam";
import type { CtResult } from "@/lib/results";
import { cn } from "@/lib/utils";

type Tab = "register" | "schedule" | "results";

type CtCabinetProps = {
  subjects: CatalogSubject[];
};

export function CtCabinet({ subjects }: CtCabinetProps) {
  const [tab, setTab] = useState<Tab>("register");
  const [exams, setExams] = useState<ExamSession[]>([]);
  const [applications, setApplications] = useState<ExamApplication[]>([]);
  const [waitlist, setWaitlist] = useState<ExamWaitlistEntry[]>([]);
  const [results, setResults] = useState<CtResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const subjectName = useCallback(
    (subjectId: string) =>
      subjects.find((s) => s.id === subjectId)?.name || "Предмет",
    [subjects],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [examsRes, appsRes, waitRes, resultsRes] = await Promise.all([
        fetch("/api/exam/exams?isReserve=false"),
        fetch("/api/exam/applications/me"),
        fetch("/api/exam/waitlist/me"),
        fetch("/api/results/me"),
      ]);

      const examsJson = (await examsRes.json().catch(() => [])) as
        | ExamSession[]
        | { error?: string };
      const appsJson = (await appsRes.json().catch(() => [])) as
        | ExamApplication[]
        | { error?: string };
      const waitJson = (await waitRes.json().catch(() => [])) as
        | ExamWaitlistEntry[]
        | { error?: string };
      const resultsJson = (await resultsRes.json().catch(() => [])) as
        | CtResult[]
        | { error?: string };

      if (!examsRes.ok || !Array.isArray(examsJson)) {
        setError(
          !Array.isArray(examsJson) && examsJson.error
            ? examsJson.error
            : "Не удалось загрузить сеансы",
        );
        return;
      }
      if (!appsRes.ok || !Array.isArray(appsJson)) {
        setError(
          !Array.isArray(appsJson) && appsJson.error
            ? appsJson.error
            : "Не удалось загрузить заявки",
        );
        return;
      }
      if (!waitRes.ok || !Array.isArray(waitJson)) {
        setError(
          !Array.isArray(waitJson) && waitJson.error
            ? waitJson.error
            : "Не удалось загрузить лист ожидания",
        );
        return;
      }
      if (!resultsRes.ok || !Array.isArray(resultsJson)) {
        setError(
          !Array.isArray(resultsJson) && resultsJson.error
            ? resultsJson.error
            : "Не удалось загрузить результаты",
        );
        return;
      }

      setExams(examsJson);
      setApplications(appsJson);
      setWaitlist(waitJson);
      setResults(resultsJson);
    } catch {
      setError("Сеть недоступна. Проверьте exam-service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const appByExam = useMemo(() => {
    const map = new Map<string, ExamApplication>();
    for (const app of applications) {
      if (app.status === "cancelled") continue;
      map.set(app.examId, app);
    }
    return map;
  }, [applications]);

  const waitByExam = useMemo(() => {
    const map = new Map<string, ExamWaitlistEntry>();
    for (const row of waitlist) {
      map.set(row.examId, row);
    }
    return map;
  }, [waitlist]);

  const filteredExams = useMemo(() => {
    if (!subjectFilter) return exams;
    return exams.filter((exam) => exam.subjectId === subjectFilter);
  }, [exams, subjectFilter]);

  const scheduleApps = useMemo(
    () =>
      applications
        .filter((app) => app.status === "pending" || app.status === "approved")
        .sort((a, b) => {
          const aAt = a.exam?.startsAt || "";
          const bAt = b.exam?.startsAt || "";
          return aAt.localeCompare(bAt);
        }),
    [applications],
  );

  const examById = useMemo(() => {
    const map = new Map<string, ExamSession>();
    for (const exam of exams) map.set(exam.id, exam);
    for (const app of applications) {
      if (app.exam) map.set(app.exam.id, app.exam);
    }
    return map;
  }, [exams, applications]);

  const ctSum = useMemo(
    () => results.reduce((sum, row) => sum + (row.score || 0), 0),
    [results],
  );

  async function apply(examId: string) {
    setBusyId(examId);
    setMessage(null);
    try {
      const res = await fetch(`/api/exam/exams/${examId}/apply`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as {
        type?: string;
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error || "Не удалось записаться");
        return;
      }
      setMessage(
        json.type === "waitlist"
          ? "Мест нет — вы в листе ожидания"
          : "Заявка отправлена на модерацию",
      );
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function cancelApplication(id: string) {
    setBusyId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/exam/applications/${id}/cancel`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(json.error || "Не удалось отменить");
        return;
      }
      setMessage("Заявка отменена");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function cancelWaitlist(id: string) {
    setBusyId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/exam/waitlist/${id}/cancel`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(json.error || "Не удалось выйти из листа ожидания");
        return;
      }
      setMessage("Вы вышли из листа ожидания");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function downloadPass(applicationId: string) {
    setBusyId(applicationId);
    setMessage(null);
    try {
      const res = await fetch(`/api/exam/applications/${applicationId}/pass`);
      const json = (await res.json().catch(() => ({}))) as {
        downloadUrl?: string;
        error?: string;
      };
      if (!res.ok || !json.downloadUrl) {
        setMessage(json.error || "Пропуск ещё не готов");
        return;
      }
      window.open(json.downloadUrl, "_blank", "noopener,noreferrer");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Мои экзамены ЦТ
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Запись на сеансы, статус заявок и скачивание пропуска.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {(
          [
            ["register", "Запись на ЦТ"],
            ["schedule", "Расписание ЦТ"],
            ["results", "Результаты (баллы)"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-[10px] px-3 py-1.5 text-sm font-semibold",
              tab === key
                ? "bg-brand-100 text-brand-900"
                : "text-text-secondary hover:bg-[#f4f7f9]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {message ? (
        <p className="rounded-[12px] border border-brand-100 bg-brand-100/40 px-4 py-3 text-sm text-brand-900">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : error ? (
        <p className="rounded-[12px] border border-[#c94343]/30 bg-[#fdecec] px-4 py-3 text-sm text-[#8a2a2a]">
          {error}
        </p>
      ) : null}

      {!loading && !error && tab === "register" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-text-secondary">
                Предмет
              </span>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="rounded-[10px] border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">Все предметы</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-3">
            {filteredExams.map((exam) => {
              const app = appByExam.get(exam.id);
              const wait = waitByExam.get(exam.id);
              const filled = exam.capacity
                ? Math.min(100, Math.round((exam.seatsTaken / exam.capacity) * 100))
                : 0;

              let badge: { text: string; className: string } | null = null;
              if (app?.status === "approved") {
                badge = {
                  text: applicationStatusLabel("approved"),
                  className: "bg-[#e4f6ec] text-[#176b45]",
                };
              } else if (app?.status === "pending") {
                badge = {
                  text: applicationStatusLabel("pending"),
                  className: "bg-[#fff4e5] text-[#9a5b00]",
                };
              } else if (app?.status === "rejected") {
                badge = {
                  text: applicationStatusLabel("rejected"),
                  className: "bg-[#fdecec] text-[#8a2a2a]",
                };
              } else if (wait) {
                badge = {
                  text: `Лист ожидания · место ${wait.position}`,
                  className: "bg-[#fff4e5] text-[#9a5b00]",
                };
              } else if (exam.seatsLeft <= 0) {
                badge = {
                  text: "Мест нет",
                  className: "bg-[#fdecec] text-[#8a2a2a]",
                };
              }

              return (
                <article
                  key={exam.id}
                  className="rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-extrabold text-brand-900">
                          {subjectName(exam.subjectId)}
                        </h2>
                        {badge ? (
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-bold",
                              badge.className,
                            )}
                          >
                            {badge.text}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-text-secondary">
                        {exam.venue?.name || "Пункт ЦТ"}
                        {exam.venue?.address ? ` · ${exam.venue.address}` : ""}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {formatExamWhen(exam.startsAt)} · {exam.duration} мин.
                      </p>
                      <div className="pt-2">
                        <div className="mb-1 flex justify-between text-xs text-text-muted">
                          <span>
                            Свободно {exam.seatsLeft} из {exam.capacity}
                          </span>
                          <span>{filled}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#eef2f5]">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              exam.seatsLeft <= 0 ? "bg-[#c94343]" : "bg-brand-700",
                            )}
                            style={{ width: `${filled}%` }}
                          />
                        </div>
                      </div>
                      {app?.status === "rejected" && app.rejectReason ? (
                        <p className="pt-1 text-xs text-[#8a2a2a]">
                          Причина: {app.rejectReason}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-stretch gap-2">
                      {app?.status === "approved" ? (
                        <button
                          type="button"
                          disabled={busyId === app.id}
                          onClick={() => void downloadPass(app.id)}
                          className="rounded-[10px] border border-border bg-white px-4 py-2 text-sm font-bold text-text-secondary hover:bg-[#f8fafc] disabled:opacity-60"
                        >
                          Пропуск
                        </button>
                      ) : null}

                      {app?.status === "pending" ? (
                        <button
                          type="button"
                          disabled={busyId === app.id}
                          onClick={() => void cancelApplication(app.id)}
                          className="rounded-[10px] px-4 py-2 text-sm font-bold text-[#c94343] hover:bg-[#fdecec] disabled:opacity-60"
                        >
                          Отменить
                        </button>
                      ) : null}

                      {wait ? (
                        <button
                          type="button"
                          disabled={busyId === wait.id}
                          onClick={() => void cancelWaitlist(wait.id)}
                          className="rounded-[10px] px-4 py-2 text-sm font-bold text-[#c94343] hover:bg-[#fdecec] disabled:opacity-60"
                        >
                          Выйти из листа
                        </button>
                      ) : null}

                      {!app && !wait && exam.seatsLeft > 0 ? (
                        <button
                          type="button"
                          disabled={busyId === exam.id}
                          onClick={() => void apply(exam.id)}
                          className="rounded-[10px] bg-brand-700 px-4 py-2 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60"
                        >
                          + Записаться
                        </button>
                      ) : null}

                      {!app && !wait && exam.seatsLeft <= 0 ? (
                        <button
                          type="button"
                          disabled={busyId === exam.id}
                          onClick={() => void apply(exam.id)}
                          className="rounded-[10px] border border-brand-700 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-100 disabled:opacity-60"
                        >
                          В лист ожидания
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}

            {filteredExams.length === 0 ? (
              <p className="rounded-[14px] border border-border bg-white p-5 text-sm text-text-secondary shadow-[var(--shadow-soft)]">
                Сеансов пока нет.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {!loading && !error && tab === "schedule" ? (
        <div className="space-y-3">
          {scheduleApps.length === 0 ? (
            <p className="rounded-[14px] border border-border bg-white p-5 text-sm text-text-secondary shadow-[var(--shadow-soft)]">
              Пока нет активных записей. Запишитесь на вкладке «Запись на ЦТ».
            </p>
          ) : (
            scheduleApps.map((app) => (
              <article
                key={app.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-extrabold text-brand-900">
                      {app.exam
                        ? subjectName(app.exam.subjectId)
                        : "Предмет"}
                    </h2>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-bold",
                        app.status === "approved"
                          ? "bg-[#e4f6ec] text-[#176b45]"
                          : "bg-[#fff4e5] text-[#9a5b00]",
                      )}
                    >
                      {applicationStatusLabel(app.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">
                    {app.exam ? formatExamWhen(app.exam.startsAt) : "—"}
                    {app.exam?.venue?.name ? ` · ${app.exam.venue.name}` : ""}
                  </p>
                  {app.passNumber ? (
                    <p className="mt-1 text-xs text-text-muted">
                      Пропуск: {app.passNumber}
                    </p>
                  ) : null}
                </div>
                {app.status === "approved" ? (
                  <button
                    type="button"
                    disabled={busyId === app.id}
                    onClick={() => void downloadPass(app.id)}
                    className="rounded-[10px] bg-brand-700 px-4 py-2 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60"
                  >
                    Пропуск
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === app.id}
                    onClick={() => void cancelApplication(app.id)}
                    className="rounded-[10px] px-4 py-2 text-sm font-bold text-[#c94343] hover:bg-[#fdecec] disabled:opacity-60"
                  >
                    Отменить
                  </button>
                )}
              </article>
            ))
          )}
        </div>
      ) : null}

      {!loading && !error && tab === "results" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Сумма ЦТ
              </p>
              <p className="mt-2 text-3xl font-black text-brand-900">{ctSum}</p>
              <p className="mt-1 text-xs text-text-secondary">
                из {results.length * 100} по {results.length} предметам
              </p>
            </div>
            <div className="rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Опубликовано
              </p>
              <p className="mt-2 text-3xl font-black text-brand-900">
                {results.length}
              </p>
              <p className="mt-1 text-xs text-text-secondary">результатов</p>
            </div>
            <div className="rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Средний балл
              </p>
              <p className="mt-2 text-3xl font-black text-brand-900">
                {results.length
                  ? Math.round(ctSum / results.length)
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-text-secondary">по опубликованным</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-[#f8fafc] text-xs font-bold uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-4 py-3">Предмет</th>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3">Балл</th>
                  <th className="px-4 py-3">Статус</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-text-secondary"
                    >
                      Пока нет опубликованных баллов.
                    </td>
                  </tr>
                ) : (
                  results.map((row) => {
                    const exam = examById.get(row.examId);
                    return (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-semibold text-brand-900">
                          {exam
                            ? subjectName(exam.subjectId)
                            : "Предмет"}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {exam ? formatExamWhen(exam.startsAt) : "—"}
                        </td>
                        <td className="px-4 py-3 text-base font-extrabold text-brand-900">
                          {row.score ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[#e4f6ec] px-2.5 py-0.5 text-xs font-bold text-[#176b45]">
                            Завершено
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
