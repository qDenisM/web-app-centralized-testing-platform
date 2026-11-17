"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApplicantProfile } from "@/lib/applicant";
import type { CatalogSubject } from "@/lib/catalog";
import {
  applicationStatusLabel,
  formatExamWhen,
  type ExamApplication,
  type ExamSession,
  type ExamWaitlistEntry,
} from "@/lib/exam";
import type { CtResult } from "@/lib/results";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { cn } from "@/lib/utils";

type Tab = "register" | "schedule" | "results" | "errors";

type CtCabinetProps = {
  subjects: CatalogSubject[];
};

const STUB_ERRORS = {
  variantSummary: "Вариант 24 · итог 62 балла из 100",
  weakTopics: [
    { topic: "Тригонометрические преобразования", share: "38%" },
    { topic: "Стереометрия", share: "24%" },
    { topic: "Логарифмы и показательные уравнения", share: "18%" },
  ],
  blankMistakes: [
    { num: 12, note: "Неверно перенесён знак при раскрытии скобок" },
    { num: 27, note: "Ответ не соответствует выбранному варианту в бланке" },
    { num: 31, note: "Пропущена единица измерения" },
  ],
};

export function CtCabinet({ subjects }: CtCabinetProps) {
  const [tab, setTab] = useState<Tab>("register");
  const [exams, setExams] = useState<ExamSession[]>([]);
  const [applications, setApplications] = useState<ExamApplication[]>([]);
  const [waitlist, setWaitlist] = useState<ExamWaitlistEntry[]>([]);
  const [results, setResults] = useState<CtResult[]>([]);
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorsSubjectId, setErrorsSubjectId] = useState<string | null>(null);

  const subjectName = useCallback(
    (subjectId: string) =>
      subjects.find((s) => s.id === subjectId)?.name || "Предмет",
    [subjects],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [examsRes, appsRes, waitRes, resultsRes, profileRes] =
        await Promise.all([
          fetch("/api/exam/exams?isReserve=false"),
          fetch("/api/exam/applications/me"),
          fetch("/api/exam/waitlist/me"),
          fetch("/api/results/me"),
          fetch("/api/applicant/profile"),
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
      const profileJson = (await profileRes.json().catch(() => null)) as
        | ApplicantProfile
        | { error?: string }
        | null;

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
      if (profileRes.ok && profileJson && !("error" in profileJson)) {
        setProfile(profileJson as ApplicantProfile);
      }
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

  const scheduleByMonth = useMemo(() => {
    const groups = new Map<string, ExamApplication[]>();
    for (const app of scheduleApps) {
      const d = app.exam?.startsAt
        ? new Date(app.exam.startsAt)
        : null;
      const key = d
        ? d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
        : "Без даты";
      const list = groups.get(key) || [];
      list.push(app);
      groups.set(key, list);
    }
    return [...groups.entries()];
  }, [scheduleApps]);

  const examById = useMemo(() => {
    const map = new Map<string, ExamSession>();
    for (const exam of exams) map.set(exam.id, exam);
    for (const app of applications) {
      if (app.exam) map.set(app.exam.id, app.exam);
    }
    return map;
  }, [exams, applications]);

  const publishedResults = useMemo(
    () => results.filter((r) => r.status === "published"),
    [results],
  );

  const ctSum = useMemo(
    () => publishedResults.reduce((sum, row) => sum + (row.score || 0), 0),
    [publishedResults],
  );

  const attestatAvg = profile?.attestatAverage ?? null;
  const attestatScaled =
    attestatAvg !== null ? Math.round(attestatAvg * 10 * 10) / 10 : null;
  // Competitive score only when both CT scores and attestat are present.
  const competitiveTotal =
    attestatScaled !== null && publishedResults.length > 0
      ? Math.round((ctSum + attestatScaled) * 10) / 10
      : null;

  const errorsResult = useMemo(() => {
    if (!errorsSubjectId) return null;
    return (
      publishedResults.find((r) => {
        const exam = examById.get(r.examId);
        return exam?.subjectId === errorsSubjectId;
      }) || null
    );
  }, [errorsSubjectId, publishedResults, examById]);

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

  function openBreakdown(result: CtResult) {
    const exam = examById.get(result.examId);
    setErrorsSubjectId(exam?.subjectId || null);
    setTab("errors");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Мои ЦТ
        </h1>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {(
          [
            ["register", "Запись на ЦТ"],
            ["schedule", "Расписание ЦТ"],
            ["results", "Результаты (Баллы)"],
            ["errors", "Разбор бланков и ошибки"],
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
              <FilterSelect
                value={subjectFilter || ""}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="min-w-[220px]"
              >
                <option value="">Все предметы</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </FilterSelect>
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
                          Скачать пропуск (PDF)
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
                          Записаться
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
        <div className="space-y-5">
          {scheduleApps.length === 0 ? (
            <p className="rounded-[14px] border border-border bg-white p-5 text-sm text-text-secondary shadow-[var(--shadow-soft)]">
              Пока нет активных записей. Запишитесь на вкладке «Запись на ЦТ».
            </p>
          ) : (
            scheduleByMonth.map(([monthLabel, apps]) => (
              <div key={monthLabel}>
                <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-text-muted">
                  {monthLabel}
                </h2>
                <div className="relative space-y-0 border-l-2 border-brand-200 pl-5">
                  {apps.map((app) => {
                    const day = app.exam?.startsAt
                      ? new Date(app.exam.startsAt).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                        })
                      : "—";
                    return (
                      <article
                        key={app.id}
                        className="relative mb-4 rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]"
                      >
                        <span className="absolute -left-[1.35rem] top-5 h-3 w-3 rounded-full border-2 border-white bg-brand-700" />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold uppercase text-brand-800">
                                {day}
                              </span>
                              <h3 className="text-base font-extrabold text-brand-900">
                                {app.exam
                                  ? subjectName(app.exam.subjectId)
                                  : "Предмет"}
                              </h3>
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
                              {app.exam?.venue?.name
                                ? ` · ${app.exam.venue.name}`
                                : ""}
                            </p>
                          </div>
                          {app.status === "approved" ? (
                            <button
                              type="button"
                              disabled={busyId === app.id}
                              onClick={() => void downloadPass(app.id)}
                              className="rounded-[10px] bg-brand-700 px-4 py-2 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60"
                            >
                              Скачать пропуск (PDF)
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
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
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
              <p className="mt-2 text-3xl font-black text-brand-900">
                {publishedResults.length ? ctSum : "—"}
              </p>
            </div>
            <div className="rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Аттестат ×10
              </p>
              <p className="mt-2 text-3xl font-black text-brand-900">
                {attestatScaled !== null ? attestatScaled : "—"}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {attestatAvg !== null
                  ? `Средний балл ${attestatAvg}`
                  : "Заполните аттестат"}
              </p>
            </div>
            <div className="rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Конкурсный
              </p>
              <p className="mt-2 text-3xl font-black text-brand-900">
                {competitiveTotal !== null ? competitiveTotal : "—"}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-[#f8fafc] text-xs font-bold uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-4 py-3">Предмет</th>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3">Балл</th>
                  <th className="px-4 py-3">Разбор</th>
                </tr>
              </thead>
              <tbody>
                {publishedResults.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-text-secondary">
                      Пока нет опубликованных баллов.
                    </td>
                  </tr>
                ) : (
                  publishedResults.map((row) => {
                    const exam = examById.get(row.examId);
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-4 py-3 font-semibold text-brand-900">
                          {exam ? subjectName(exam.subjectId) : "Предмет"}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {exam ? formatExamWhen(exam.startsAt) : "—"}
                        </td>
                        <td className="px-4 py-3 text-base font-extrabold text-brand-900">
                          {row.score ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openBreakdown(row)}
                            className="text-sm font-bold text-brand-700 hover:underline"
                          >
                            Разбор
                          </button>
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

      {!loading && !error && tab === "errors" ? (
        <div className="space-y-4">
          <label className="block max-w-md text-sm">
            <span className="mb-1.5 block font-semibold text-text-secondary">
              Предмет для разбора
            </span>
            <FilterSelect
              value={errorsSubjectId || ""}
              onChange={(e) => setErrorsSubjectId(e.target.value || null)}
            >
              <option value="">Выберите предмет</option>
              {publishedResults.map((row) => {
                const exam = examById.get(row.examId);
                if (!exam) return null;
                return (
                  <option key={row.id} value={exam.subjectId}>
                    {subjectName(exam.subjectId)} — {row.score ?? "—"} баллов
                  </option>
                );
              })}
            </FilterSelect>
          </label>

          {!errorsSubjectId ? (
            <p className="rounded-[14px] border border-border bg-white p-5 text-sm text-text-secondary shadow-[var(--shadow-soft)]">
              Выберите предмет с опубликованными результатами или дождитесь
              публикации баллов.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-text-muted">
                Демо-разбор: данные ниже показаны для макета интерфейса.
              </p>
              <div className="grid gap-4 lg:grid-cols-3">
                <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-text-muted">
                    Итог по варианту
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-amber-800">Демо</p>
                  <p className="mt-3 text-sm font-semibold text-brand-900">
                    {STUB_ERRORS.variantSummary}
                  </p>
                  <p className="mt-2 text-xs text-text-secondary">
                    Предмет: {subjectName(errorsSubjectId)}
                    {errorsResult
                      ? ` · балл ${errorsResult.score ?? "—"}`
                      : " · результат ещё не опубликован"}
                  </p>
                </section>

                <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-text-muted">
                    Слабые темы
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-amber-800">Демо</p>
                  <ul className="mt-3 space-y-2">
                    {STUB_ERRORS.weakTopics.map((item) => (
                      <li
                        key={item.topic}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="text-text-secondary">{item.topic}</span>
                        <span className="font-bold text-brand-800">
                          {item.share}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-text-muted">
                    Ошибки в бланке ответов
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-amber-800">Демо</p>
                  <ul className="mt-3 space-y-3">
                    {STUB_ERRORS.blankMistakes.map((item) => (
                      <li
                        key={item.num}
                        className="rounded-[10px] border border-border bg-[#f8fafc] px-3 py-2 text-sm"
                      >
                        <span className="font-bold text-brand-900">
                          Задание {item.num}
                        </span>
                        <p className="mt-0.5 text-text-secondary">{item.note}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}