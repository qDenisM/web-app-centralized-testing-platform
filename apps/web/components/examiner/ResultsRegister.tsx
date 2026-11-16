"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogSubject } from "@/lib/catalog";
import { formatExamWhen, type ExamSession } from "@/lib/exam";
import {
  resultStatusLabel,
  shortUserId,
  type CtResult,
  type ExaminerResultsResponse,
} from "@/lib/results";
import { cn } from "@/lib/utils";
import { FormButton } from "@/components/ui/FormButton";

type StatusTab = "all" | "missing" | "draft" | "absent" | "published";

type ResultsRegisterProps = {
  subjects: CatalogSubject[];
};

export function ResultsRegister({ subjects }: ResultsRegisterProps) {
  const [tab, setTab] = useState<StatusTab>("all");
  const [examId, setExamId] = useState("");
  const [exams, setExams] = useState<ExamSession[]>([]);
  const [data, setData] = useState<ExaminerResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [batchPublishing, setBatchPublishing] = useState(false);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});

  const subjectName = useCallback(
    (subjectId: string) =>
      subjects.find((s) => s.id === subjectId)?.name || "Предмет",
    [subjects],
  );

  const examsById = useMemo(() => {
    const map = new Map<string, ExamSession>();
    for (const exam of exams) map.set(exam.id, exam);
    return map;
  }, [exams]);

  const loadExams = useCallback(async () => {
    try {
      const res = await fetch("/api/exam/examiner/exams");
      const json = (await res.json().catch(() => [])) as ExamSession[] & {
        error?: string;
      };
      if (res.ok && Array.isArray(json)) {
        setExams(json);
      }
    } catch {
      setExams([]);
    }
  }, []);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status: tab });
      if (examId) params.set("examId", examId);
      const res = await fetch(`/api/results/examiner/results?${params.toString()}`);
      const json = (await res.json().catch(() => ({}))) as ExaminerResultsResponse & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "Не удалось загрузить результаты");
        return;
      }
      setData(json);
    } catch {
      setError("Сеть недоступна. Проверьте results-service.");
    } finally {
      setLoading(false);
    }
  }, [tab, examId]);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  const counts = data?.counts;
  const items = data?.items || [];

  const draftReadyIds = useMemo(
    () =>
      items
        .filter((r) => r.status === "draft" && r.score !== null && r.score !== undefined)
        .map((r) => r.id),
    [items],
  );

  async function syncFromExam() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/results/examiner/results/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(examId ? { examId } : {}),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось синхронизировать");
        return;
      }
      await loadResults();
    } catch {
      setError("Сеть недоступна при синхронизации");
    } finally {
      setSyncing(false);
    }
  }

  async function patchResult(id: string, body: { score?: number | null; status?: string }) {
    setRowBusy((prev) => ({ ...prev, [id]: true }));
    setError(null);
    try {
      const res = await fetch(`/api/results/examiner/results/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as CtResult & { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось сохранить");
        return;
      }
      await loadResults();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setRowBusy((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function publishOne(id: string) {
    setRowBusy((prev) => ({ ...prev, [id]: true }));
    setError(null);
    try {
      const res = await fetch(`/api/results/examiner/results/${id}/publish`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось опубликовать");
        return;
      }
      await loadResults();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setRowBusy((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function publishBatch() {
    if (draftReadyIds.length === 0) return;
    setBatchPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/results/examiner/results/publish-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: draftReadyIds }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось опубликовать пакет");
        return;
      }
      await loadResults();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setBatchPublishing(false);
    }
  }

  function examLine(examIdRow: string) {
    const exam = examsById.get(examIdRow);
    if (!exam) return { title: "Экзамен", when: "—", venue: "—" };
    const venue = exam.venue
      ? `${exam.venue.name}, ${exam.venue.city}`
      : "Площадка не указана";
    return {
      title: subjectName(exam.subjectId),
      when: formatExamWhen(exam.startsAt),
      venue,
    };
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Реестр результатов ЦТ
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Синхронизация с допущенными абитуриентами, ввод баллов и публикация.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FormButton
            type="button"
            variant="secondary"
            className="w-auto px-4 py-2.5"
            disabled={syncing}
            onClick={() => void syncFromExam()}
          >
            {syncing ? "Синхронизация…" : "Синхронизировать с экзаменом"}
          </FormButton>
          {draftReadyIds.length > 0 ? (
            <FormButton
              type="button"
              className="w-auto px-4 py-2.5"
              disabled={batchPublishing}
              onClick={() => void publishBatch()}
            >
              {batchPublishing
                ? "Публикация…"
                : `Опубликовать черновики (${draftReadyIds.length})`}
            </FormButton>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <CountCard label="Всего" value={counts?.all} accent="brand" />
        <CountCard label="Не внесён" value={counts?.missing} accent="muted" />
        <CountCard label="Черновик" value={counts?.draft} accent="draft" />
        <CountCard label="Неявка" value={counts?.absent} accent="warn" />
        <CountCard label="Опубликован" value={counts?.published} accent="ok" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
          className="min-w-[200px] rounded-[10px] border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">Все экзамены</option>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {subjectName(exam.subjectId)} · {formatExamWhen(exam.startsAt)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "Все", counts?.all],
            ["missing", "Не внесён", counts?.missing],
            ["draft", "Черновик", counts?.draft],
            ["absent", "Неявка", counts?.absent],
            ["published", "Опубликован", counts?.published],
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

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка реестра…</p>
      ) : items.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-white p-8 text-center text-sm text-text-muted">
          Записей нет. Нажмите «Синхронизировать с экзаменом», чтобы подтянуть допущенных
          абитуриентов.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-[#f8fafc] text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-3 font-bold">Абитуриент</th>
                <th className="px-4 py-3 font-bold">Экзамен</th>
                <th className="px-4 py-3 font-bold">Статус</th>
                <th className="px-4 py-3 font-bold">Балл</th>
                <th className="px-4 py-3 font-bold">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <ResultRow
                  key={row.id}
                  row={row}
                  busy={Boolean(rowBusy[row.id])}
                  examLine={examLine(row.examId)}
                  scoreValue={
                    scoreDrafts[row.id] ??
                    (row.score !== null && row.score !== undefined ? String(row.score) : "")
                  }
                  onScoreChange={(v) =>
                    setScoreDrafts((prev) => ({ ...prev, [row.id]: v }))
                  }
                  onSaveScore={async () => {
                    const raw = (scoreDrafts[row.id] ?? "").trim();
                    if (!raw) return;
                    const num = Number.parseInt(raw, 10);
                    if (Number.isNaN(num) || num < 0 || num > 100) {
                      setError("Балл от 0 до 100");
                      return;
                    }
                    await patchResult(row.id, { score: num });
                    setScoreDrafts((prev) => {
                      const next = { ...prev };
                      delete next[row.id];
                      return next;
                    });
                  }}
                  onAbsent={() => void patchResult(row.id, { status: "absent" })}
                  onPublish={() => void publishOne(row.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CountCard({
  label,
  value,
  accent,
}: {
  label: string;
  value?: number;
  accent: "brand" | "muted" | "draft" | "warn" | "ok";
}) {
  const styles = {
    brand: "border-brand-200 bg-brand-50 text-brand-900",
    muted: "border-border bg-white text-text-primary",
    draft: "border-[#d6e4ff] bg-[#f0f5ff] text-[#1d39c4]",
    warn: "border-[#ffe7ba] bg-[#fff7e6] text-[#ad6800]",
    ok: "border-green-200 bg-green-50 text-green-900",
  }[accent];

  return (
    <div className={cn("rounded-[14px] border px-4 py-3 shadow-[var(--shadow-soft)]", styles)}>
      <div className="text-xs font-bold uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums">
        {typeof value === "number" ? value : "—"}
      </div>
    </div>
  );
}

function ResultRow({
  row,
  busy,
  examLine,
  scoreValue,
  onScoreChange,
  onSaveScore,
  onAbsent,
  onPublish,
}: {
  row: CtResult;
  busy: boolean;
  examLine: { title: string; when: string; venue: string };
  scoreValue: string;
  onScoreChange: (v: string) => void;
  onSaveScore: () => void;
  onAbsent: () => void;
  onPublish: () => void;
}) {
  const locked = row.status === "published";
  const canEdit = !locked && row.status !== "absent";

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-3">
        <div className="font-semibold text-text-primary">
          Участник {shortUserId(row.userId)}
        </div>
        <div className="text-xs text-text-muted">ID: {row.userId}</div>
      </td>
      <td className="px-4 py-3 text-text-secondary">
        <div className="font-semibold text-text-primary">{examLine.title}</div>
        <div className="text-xs text-text-muted">{examLine.when}</div>
        <div className="text-xs text-text-muted">{examLine.venue}</div>
      </td>
      <td className="px-4 py-3">
        <StatusPill status={row.status} />
      </td>
      <td className="px-4 py-3">
        {row.status === "absent" ? (
          <span className="text-text-muted">—</span>
        ) : locked ? (
          <span className="font-bold text-brand-900">{row.score ?? "—"}</span>
        ) : (
          <input
            type="number"
            min={0}
            max={100}
            value={scoreValue}
            disabled={busy || !canEdit}
            onChange={(e) => onScoreChange(e.target.value)}
            className="w-20 rounded-[10px] border border-border px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
          />
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSaveScore()}
              className="rounded-[10px] border border-border bg-white px-3 py-1.5 text-xs font-bold text-text-secondary hover:bg-[#f8fafc] disabled:opacity-60"
            >
              Сохранить балл
            </button>
          ) : null}
          {!locked && row.status !== "absent" ? (
            <button
              type="button"
              disabled={busy}
              onClick={onAbsent}
              className="rounded-[10px] border border-border bg-white px-3 py-1.5 text-xs font-bold text-text-secondary hover:bg-[#f8fafc] disabled:opacity-60"
            >
              Неявка
            </button>
          ) : null}
          {row.status === "draft" && row.score !== null ? (
            <button
              type="button"
              disabled={busy}
              onClick={onPublish}
              className="rounded-[10px] bg-brand-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              Опубликовать
            </button>
          ) : null}
          {locked ? (
            <span className="text-xs font-semibold text-text-muted">
              {row.publishedAt
                ? new Date(row.publishedAt).toLocaleString("ru-RU")
                : "Опубликовано"}
            </span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
        status === "published" && "bg-green-50 text-green-800",
        status === "draft" && "bg-[#f0f5ff] text-[#1d39c4]",
        status === "missing" && "bg-[#f4f7f9] text-text-secondary",
        status === "absent" && "bg-[#fff7e6] text-[#ad6800]",
      )}
    >
      {resultStatusLabel(status)}
    </span>
  );
}