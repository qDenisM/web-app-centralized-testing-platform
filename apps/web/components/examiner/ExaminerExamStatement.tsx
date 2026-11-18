"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CatalogSubject } from "@/lib/catalog";
import {
  formatExamVenue,
  formatExamWhenShort,
  type ExamApplication,
  type ExamSession,
} from "@/lib/exam";
import {
  shortUserId,
  type CtResult,
  type CtResultStatus,
  type ExaminerResultsResponse,
} from "@/lib/results";
import { cn } from "@/lib/utils";
import { FormButton } from "@/components/ui/FormButton";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { ResultStatusBadge } from "@/components/ui/StatusBadge";

type ExaminerExamStatementProps = {
  examId: string;
  subjects: CatalogSubject[];
};

type Attendance = "present" | "absent";

type RowDraft = {
  resultId: string;
  attendance: Attendance;
  score: string;
  comment: string;
  dirty: boolean;
  status: CtResultStatus;
};

const COMMENT_KEY = (id: string) => `ct-result-comment-${id}`;
const PAGE_SIZE = 10;

const fieldClass =
  "w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function ExaminerExamStatement({
  examId,
  subjects,
}: ExaminerExamStatementProps) {
  const [exam, setExam] = useState<ExamSession | null>(null);
  const [apps, setApps] = useState<ExamApplication[]>([]);
  const [results, setResults] = useState<CtResult[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [publishOpen, setPublishOpen] = useState(false);
  const [saveFlash, setSaveFlash] = useState<string | null>(null);
  const scoreRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const subjectName = useCallback(
    (subjectId: string) =>
      subjects.find((s) => s.id === subjectId)?.name || "Предмет",
    [subjects],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const syncRes = await fetch("/api/results/examiner/results/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId }),
      });
      if (!syncRes.ok) {
        const syncJson = (await syncRes.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(syncJson.error || "Не удалось синхронизировать ведомость");
        return;
      }

      const [examsRes, appsRes, resultsRes] = await Promise.all([
        fetch("/api/exam/examiner/exams"),
        fetch(
          `/api/exam/examiner/applications?status=approved&examId=${encodeURIComponent(examId)}`,
        ),
        fetch(
          `/api/results/examiner/results?status=all&examId=${encodeURIComponent(examId)}`,
        ),
      ]);

      const examsJson = (await examsRes.json().catch(() => [])) as ExamSession[];
      const appsJson = (await appsRes.json().catch(() => ({}))) as {
        items?: ExamApplication[];
        error?: string;
      };
      const resultsJson = (await resultsRes.json().catch(() => ({}))) as
        ExaminerResultsResponse & { error?: string };

      if (!examsRes.ok) {
        setError("Не удалось загрузить экзамен");
        return;
      }
      const found = (Array.isArray(examsJson) ? examsJson : []).find(
        (e) => e.id === examId,
      );
      if (!found) {
        setError("Экзамен не найден");
        setExam(null);
        return;
      }
      setExam(found);

      if (!appsRes.ok) {
        setError(appsJson.error || "Не удалось загрузить ведомость");
        return;
      }
      if (!resultsRes.ok) {
        setError(resultsJson.error || "Не удалось загрузить результаты");
        return;
      }

      const nextApps = appsJson.items || [];
      const nextResults = resultsJson.items || [];
      setApps(nextApps);
      setResults(nextResults);

      const byUser = new Map(nextResults.map((r) => [r.userId, r]));
      const nextDrafts: Record<string, RowDraft> = {};
      for (const app of nextApps) {
        const result = byUser.get(app.userId);
        if (!result) continue;
        let comment = "";
        try {
          comment = localStorage.getItem(COMMENT_KEY(result.id)) || "";
        } catch {
          comment = "";
        }
        nextDrafts[result.id] = {
          resultId: result.id,
          attendance: result.status === "absent" ? "absent" : "present",
          score:
            result.status === "absent" || result.score === null
              ? ""
              : String(result.score),
          comment,
          dirty: false,
          status: result.status,
        };
      }
      setDrafts(nextDrafts);
      setPage(1);
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const byUser = new Map(results.map((r) => [r.userId, r]));
    return apps
      .map((app, index) => {
        const result = byUser.get(app.userId) || null;
        return { app, result, index };
      })
      .filter((row): row is { app: ExamApplication; result: CtResult; index: number } =>
        Boolean(row.result),
      );
  }, [apps, results]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const shownFrom = rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const shownTo = Math.min(page * PAGE_SIZE, rows.length);

  const progress = useMemo(() => {
    const total = Math.max(
      exam?.capacity || 0,
      exam?.seatsTaken || 0,
      rows.length,
    );
    let entered = 0;
    for (const { result } of rows) {
      const d = drafts[result.id];
      if (!d) {
        if (result.status !== "missing") entered += 1;
        continue;
      }
      if (d.attendance === "absent") {
        entered += 1;
        continue;
      }
      if (d.score.trim() !== "" || d.status === "draft" || d.status === "published") {
        entered += 1;
      }
    }
    const pct = total > 0 ? Math.round((entered / total) * 100) : 0;
    return { entered, total, pct, remaining: Math.max(0, total - entered) };
  }, [drafts, exam, rows]);

  function updateDraft(id: string, patch: Partial<RowDraft>) {
    setDrafts((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return {
        ...prev,
        [id]: { ...cur, ...patch, dirty: true },
      };
    });
  }

  async function patchResult(
    id: string,
    body: { score?: number | null; status?: string },
  ) {
    const res = await fetch(`/api/results/examiner/results/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(json.error || "Не удалось сохранить");
  }

  async function saveDrafts() {
    setBusy(true);
    setError(null);
    setSaveFlash(null);
    try {
      const dirty = Object.values(drafts).filter((d) => d.dirty);
      for (const d of dirty) {
        if (d.attendance === "absent") {
          if (d.status === "published") {
            throw new Error("Нельзя отметить неявку для опубликованного результата");
          }
          await patchResult(d.resultId, { status: "absent", score: null });
        } else {
          const trimmed = d.score.trim();
          if (trimmed === "") {
            if (d.status === "published") {
              throw new Error("Для опубликованного результата укажите балл 0–100");
            }
            await patchResult(d.resultId, { status: "missing", score: null });
          } else {
            const num = Number(trimmed);
            if (!Number.isInteger(num) || num < 0 || num > 100) {
              throw new Error("Балл должен быть целым числом от 0 до 100");
            }
            if (d.status === "published") {
              await patchResult(d.resultId, { score: num });
            } else {
              await patchResult(d.resultId, { score: num, status: "draft" });
            }
          }
        }
        try {
          if (d.comment.trim()) {
            localStorage.setItem(COMMENT_KEY(d.resultId), d.comment.trim());
          } else {
            localStorage.removeItem(COMMENT_KEY(d.resultId));
          }
        } catch {
          /* ignore */
        }
      }
      await load();
      setSaveFlash("Черновик сохранён");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  async function publishResults() {
    setBusy(true);
    setError(null);
    try {
      // Persist dirty rows first so publish sees current scores.
      const dirty = Object.values(drafts).filter((d) => d.dirty);
      for (const d of dirty) {
        if (d.attendance === "absent") {
          await patchResult(d.resultId, { status: "absent", score: null });
        } else {
          const trimmed = d.score.trim();
          if (trimmed === "") continue;
          const num = Number(trimmed);
          if (!Number.isInteger(num) || num < 0 || num > 100) {
            throw new Error("Балл должен быть целым числом от 0 до 100");
          }
          const body: { score: number; status?: string } = { score: num };
          if (d.status !== "published") body.status = "draft";
          await patchResult(d.resultId, body);
        }
        try {
          if (d.comment.trim()) {
            localStorage.setItem(COMMENT_KEY(d.resultId), d.comment.trim());
          }
        } catch {
          /* ignore */
        }
      }

      const refreshRes = await fetch(
        `/api/results/examiner/results?status=all&examId=${encodeURIComponent(examId)}`,
      );
      const refreshJson = (await refreshRes.json().catch(() => ({}))) as
        ExaminerResultsResponse;
      const items = refreshJson.items || [];
      const ids = items
        .filter((r) => r.status === "draft" && r.score !== null)
        .map((r) => r.id);

      if (ids.length === 0) {
        throw new Error("Нет черновиков с баллом для публикации");
      }

      const res = await fetch("/api/results/examiner/results/publish-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Не удалось опубликовать");

      setPublishOpen(false);
      await load();
      setSaveFlash("Результаты опубликованы");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка публикации");
    } finally {
      setBusy(false);
    }
  }

  function focusNextScore(currentId: string) {
    const order = pageRows.map((r) => r.result.id);
    const idx = order.indexOf(currentId);
    if (idx < 0) return;
    const nextId = order[idx + 1];
    if (!nextId) return;
    const el = scoreRefs.current.get(nextId);
    el?.focus();
    el?.select();
  }

  const titleSubject = exam ? subjectName(exam.subjectId) : "Экзамен";
  const titleWhen = exam ? formatExamWhenShort(exam.startsAt) : "";
  const venueLabel = exam ? formatExamVenue(exam) : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            {exam ? `${titleSubject} • ${titleWhen}` : "Ведомость экзамена"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {exam ? `Пункт проведения: ${venueLabel}` : "Загрузка…"}
          </p>
        </div>
        <Link
          href="/examiner/exams"
          className="inline-flex items-center rounded-[10px] border border-border bg-white px-3.5 py-2 text-sm font-bold text-text-secondary hover:bg-[#f8fafc] hover:text-text-primary"
        >
          ← К экзаменам
        </Link>
      </div>

      {error ? (
        <Alert>{error}</Alert>
      ) : null}
      {saveFlash ? (
        <p className="rounded-[10px] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {saveFlash}
        </p>
      ) : null}

      {loading || !exam ? (
        <p className="text-sm text-text-muted">Загрузка ведомости…</p>
      ) : (
        <>
          <div className="rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-text-secondary">
                Внесено результатов:{" "}
                <span className="font-semibold text-text-primary">
                  {progress.entered} из {progress.total}
                </span>
              </p>
              <span className="text-sm font-bold text-brand-700">
                {progress.pct}%
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#eef2f5]">
              <div
                className="h-full rounded-full bg-brand-700 transition-[width]"
                style={{ width: `${Math.min(100, progress.pct)}%` }}
              />
            </div>
          </div>
          <p className="text-sm font-medium text-brand-700">
            Совет: нажимайте Enter для перехода к следующему баллу
          </p>

          {rows.length === 0 ? (
            <p className="rounded-[14px] border border-border bg-white p-6 text-sm text-text-muted">
              Нет допущенных абитуриентов.
            </p>
          ) : (
            <div className="overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border bg-[#f8fafc] text-xs font-bold uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-3 py-3">Абитуриент</th>
                      <th className="px-3 py-3">Номер пропуска</th>
                      <th className="px-3 py-3">Явка</th>
                      <th className="px-3 py-3">Балл (0–100)</th>
                      <th className="px-3 py-3">Статус строки</th>
                      <th className="px-3 py-3">Заметка / комментарий</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map(({ app, result, index }) => {
                      const d = drafts[result.id];
                      if (!d) return null;
                      const displayStatus =
                        d.attendance === "absent"
                          ? "absent"
                          : d.score.trim() === "" && d.status === "missing"
                            ? "missing"
                            : d.status === "published" && !d.dirty
                              ? "published"
                              : d.score.trim() !== "" || d.status === "draft"
                                ? d.status === "published"
                                  ? "published"
                                  : "draft"
                                : d.status;
                      return (
                        <tr key={result.id} className="border-b border-border">
                          <td className="px-3 py-2.5 font-semibold text-text-primary">
                            {index + 1}. {applicantDisplay(app.userId)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-text-secondary">
                            {app.passNumber || "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              className={cn(fieldClass, "min-w-[7.5rem]")}
                              value={d.attendance}
                              disabled={busy || result.status === "published"}
                              onChange={(e) => {
                                const attendance = e.target.value as Attendance;
                                updateDraft(result.id, {
                                  attendance,
                                  score: attendance === "absent" ? "" : d.score,
                                });
                              }}
                            >
                              <option value="present">Был</option>
                              <option value="absent">Неявка</option>
                            </select>
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              ref={(el) => {
                                if (el) scoreRefs.current.set(result.id, el);
                                else scoreRefs.current.delete(result.id);
                              }}
                              type="text"
                              inputMode="numeric"
                              className={cn(fieldClass, "w-20 text-center tabular-nums")}
                              value={
                                d.attendance === "absent"
                                  ? "—"
                                  : d.score
                              }
                              disabled={busy || d.attendance === "absent"}
                              placeholder="—"
                              onChange={(e) => {
                                const v = e.target.value.replace(/[^\d]/g, "");
                                if (v.length > 3) return;
                                updateDraft(result.id, { score: v });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  focusNextScore(result.id);
                                }
                              }}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <ResultStatusBadge status={displayStatus} />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              className={cn(fieldClass, "min-w-[12rem]")}
                              value={d.comment}
                              disabled={busy}
                              placeholder="Комментарий"
                              onChange={(e) =>
                                updateDraft(result.id, {
                                  comment: e.target.value,
                                })
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                <p className="text-sm text-text-muted">
                  Показано {shownFrom}–{shownTo} из {rows.length}
                </p>
                <div className="flex items-center gap-1">
                  <PagerButton
                    disabled={page <= 1 || busy}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Пред
                  </PagerButton>
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map(
                    (n) => (
                      <PagerButton
                        key={n}
                        active={n === page}
                        disabled={busy}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </PagerButton>
                    ),
                  )}
                  <PagerButton
                    disabled={page >= pageCount || busy}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  >
                    След
                  </PagerButton>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto px-4 py-2.5"
              disabled={busy || rows.length === 0}
              onClick={() => void saveDrafts()}
            >
              Сохранить черновик
            </FormButton>
            <FormButton
              type="button"
              variant="primary"
              className="w-auto px-4 py-2.5"
              disabled={busy || rows.length === 0}
              onClick={() => {
                setError(null);
                setPublishOpen(true);
              }}
            >
              Опубликовать результаты
            </FormButton>
          </div>
        </>
      )}

      <Modal
        open={publishOpen}
        onClose={() => {
          if (!busy) setPublishOpen(false);
        }}
        title="Опубликовать результаты экзамена?"
        subtitle="Баллы станут официальными и доступными абитуриентам"
        size="md"
        footer={
          <>
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto px-4 py-2.5"
              disabled={busy}
              onClick={() => setPublishOpen(false)}
            >
              Отмена
            </FormButton>
            <FormButton
              type="button"
              variant="primary"
              className="w-auto px-4 py-2.5"
              disabled={busy}
              onClick={() => void publishResults()}
            >
              Опубликовать результаты
            </FormButton>
          </>
        }
      >
        <div className="space-y-4 text-sm leading-relaxed text-text-secondary">
          <p>
            Вы подтверждаете публикацию{" "}
            <span className="font-semibold text-text-primary">
              {progress.entered}
            </span>{" "}
            результатов по дисциплине{" "}
            <span className="font-semibold text-text-primary">
              {titleSubject}
            </span>{" "}
            ({exam?.venue?.name || "пункт"})?
          </p>
          {progress.remaining > 0 ? (
            <div className="rounded-[10px] border border-[#f0d9a8] bg-[#fff8e8] px-3.5 py-3 text-[#8a6a20]">
              Без внесённого результата останутся {progress.remaining} человек.
              Они будут помечены как не заполненные.
            </div>
          ) : (
            <div className="rounded-[10px] border border-green-200 bg-green-50 px-3.5 py-3 text-green-800">
              Все строки ведомости заполнены.
            </div>
          )}
          <p className="text-text-muted">
            Каждому абитуриенту будет отправлено Push/SMS уведомление и
            обновлена сумма баллов в светофоре шансов.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function applicantDisplay(userId: string) {
  return `Участник ${shortUserId(userId)}`;
}

function PagerButton({
  children,
  onClick,
  disabled,
  active,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-w-9 rounded-[8px] px-2.5 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-brand-700 text-white"
          : "border border-border bg-white text-text-secondary hover:bg-[#f8fafc]",
      )}
    >
      {children}
    </button>
  );
}
