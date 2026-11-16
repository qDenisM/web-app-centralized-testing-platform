"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CatalogSubject } from "@/lib/catalog";
import { formatExamWhen, type ExamApplication, type ExamSession } from "@/lib/exam";
import {
  resultStatusLabel,
  shortUserId,
  type CtResult,
  type ExaminerResultsResponse,
} from "@/lib/results";
import { cn } from "@/lib/utils";
import { FormButton } from "@/components/ui/FormButton";
import { Drawer } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type ScopeTab = "all" | "mine";

type ResultsRegisterProps = {
  subjects: CatalogSubject[];
};

const fieldClass =
  "w-full rounded-[10px] border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function ResultsRegister({ subjects }: ResultsRegisterProps) {
  const [scope, setScope] = useState<ScopeTab>("all");
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [venueFilter, setVenueFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exams, setExams] = useState<ExamSession[]>([]);
  const [applications, setApplications] = useState<ExamApplication[]>([]);
  const [data, setData] = useState<ExaminerResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<CtResult | null>(null);
  const [publishOneId, setPublishOneId] = useState<string | null>(null);
  const [batchPublishOpen, setBatchPublishOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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

  const passByUserExam = useMemo(() => {
    const map = new Map<string, string>();
    for (const app of applications) {
      map.set(`${app.userId}:${app.examId}`, app.passNumber || "—");
    }
    return map;
  }, [applications]);

  const loadExams = useCallback(async () => {
    try {
      const res = await fetch("/api/exam/examiner/exams");
      const json = (await res.json().catch(() => [])) as ExamSession[];
      if (res.ok && Array.isArray(json)) setExams(json);
    } catch {
      setExams([]);
    }
  }, []);

  const loadApplications = useCallback(async () => {
    try {
      const res = await fetch("/api/exam/examiner/applications?status=approved");
      const json = (await res.json().catch(() => ({}))) as { items?: ExamApplication[] };
      if (res.ok) setApplications(json.items || []);
    } catch {
      setApplications([]);
    }
  }, []);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status: "all" });
      if (scope === "mine") params.set("mine", "true");
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
  }, [scope]);

  useEffect(() => {
    void loadExams();
    void loadApplications();
  }, [loadExams, loadApplications]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  useEffect(() => {
    setPage(1);
  }, [search, subjectFilter, venueFilter, statusFilter, scope]);

  const counts = data?.counts;
  const items = data?.items || [];

  const venues = useMemo(() => {
    const set = new Set<string>();
    for (const exam of exams) {
      if (exam.venue?.name) set.add(exam.venue.name);
    }
    return [...set].sort();
  }, [exams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      const exam = examsById.get(row.examId);
      if (subjectFilter && exam?.subjectId !== subjectFilter) return false;
      if (venueFilter && exam?.venue?.name !== venueFilter) return false;
      const pass = passByUserExam.get(`${row.userId}:${row.examId}`) || "";
      const hay = `${row.userId} ${pass}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      return true;
    });
  }, [items, search, statusFilter, subjectFilter, venueFilter, examsById, passByUserExam]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const draftSelectedIds = useMemo(
    () =>
      [...selected].filter((id) => {
        const row = items.find((r) => r.id === id);
        return row?.status === "draft" && row.score !== null && row.score !== undefined;
      }),
    [selected, items],
  );

  async function patchResult(id: string, body: { score?: number | null; status?: string }) {
    const res = await fetch(`/api/results/examiner/results/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(json.error || "Не удалось сохранить");
  }

  async function publishId(id: string) {
    const res = await fetch(`/api/results/examiner/results/${id}/publish`, { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(json.error || "Не удалось опубликовать");
  }

  async function publishBatchIds(ids: string[]) {
    const res = await fetch("/api/results/examiner/results/publish-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(json.error || "Не удалось опубликовать пакет");
  }

  function examMeta(examIdRow: string) {
    const exam = examsById.get(examIdRow);
    if (!exam) {
      return { subject: "—", date: "—", venue: "—", subjectId: "" };
    }
    const venue = exam.venue
      ? `${exam.venue.name}${exam.venue.city ? `, ${exam.venue.city}` : ""}`
      : "—";
    return {
      subject: subjectName(exam.subjectId),
      date: formatExamDateShort(exam.startsAt),
      venue,
      subjectId: exam.subjectId,
    };
  }

  function toggleAllOnPage() {
    const ids = pageItems.map((r) => r.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Реестр результатов ЦТ
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Внесение, аудит и публикация баллов по всем пунктам проведения тестирования.
          </p>
        </div>
        <FormButton
          type="button"
          className="w-auto px-4 py-2.5"
          onClick={() => setAddOpen(true)}
        >
          + Добавить результат
        </FormButton>
      </div>

      <div className="inline-flex rounded-[10px] border border-border bg-white p-1">
        <button
          type="button"
          onClick={() => setScope("all")}
          className={cn(
            "rounded-[8px] px-4 py-2 text-sm font-bold",
            scope === "all" ? "bg-brand-700 text-white" : "text-text-secondary",
          )}
        >
          Все результаты по РБ
        </button>
        <button
          type="button"
          onClick={() => setScope("mine")}
          className={cn(
            "rounded-[8px] px-4 py-2 text-sm font-bold",
            scope === "mine" ? "bg-brand-700 text-white" : "text-text-secondary",
          )}
        >
          Внесённые мной
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Всего" value={counts?.all} />
        <KpiCard label="Не внесено" value={counts?.missing} />
        <KpiCard label="Черновиков" value={counts?.draft} />
        <KpiCard label="Опубликовано" value={counts?.published} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по ФИО, email или номеру пропуска…"
          className={cn(fieldClass, "flex-1")}
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className={cn(fieldClass, "min-w-[140px]")}
          >
            <option value="">Все предметы</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={venueFilter}
            onChange={(e) => setVenueFilter(e.target.value)}
            className={cn(fieldClass, "min-w-[160px]")}
          >
            <option value="">Все пункты ЦТ</option>
            {venues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={cn(fieldClass, "min-w-[140px]")}
          >
            <option value="all">Все статусы</option>
            <option value="missing">Не внесён</option>
            <option value="draft">Черновик</option>
            <option value="absent">Неявка</option>
            <option value="published">Опубликован</option>
          </select>
        </div>
      </div>

      {draftSelectedIds.length > 0 ? (
        <motion>
          <FormButton
            type="button"
            className="w-auto px-4 py-2"
            onClick={() => setBatchPublishOpen(true)}
          >
            Опубликовать выбранные ({draftSelectedIds.length})
          </FormButton>
        </motion>
      ) : null}

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка реестра…</p>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-[#f8fafc] text-xs font-bold uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label="Выбрать все на странице"
                    checked={
                      pageItems.length > 0 &&
                      pageItems.every((r) => selected.has(r.id))
                    }
                    onChange={toggleAllOnPage}
                  />
                </th>
                <th className="px-3 py-3">Абитуриент</th>
                <th className="px-3 py-3">Пропуск</th>
                <th className="px-3 py-3">Предмет</th>
                <th className="px-3 py-3">Дата ЦТ</th>
                <th className="px-3 py-3">Пункт проведения</th>
                <th className="px-3 py-3">Балл</th>
                <th className="px-3 py-3">Статус</th>
                <th className="px-3 py-3">Кто внёс</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-text-muted">
                    Записей не найдено
                  </td>
                </tr>
              ) : (
                pageItems.map((row) => {
                  const meta = examMeta(row.examId);
                  const pass =
                    passByUserExam.get(`${row.userId}:${row.examId}`) || "—";
                  return (
                    <tr key={row.id} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(row.id)) next.delete(row.id);
                              else next.add(row.id);
                              return next;
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-3 font-semibold text-text-primary">
                        Участник {shortUserId(row.userId)}
                      </td>
                      <td className="px-3 py-3 text-text-secondary">{pass}</td>
                      <td className="px-3 py-3">{meta.subject}</td>
                      <td className="px-3 py-3 text-text-secondary">{meta.date}</td>
                      <td className="px-3 py-3 text-text-secondary">{meta.venue}</td>
                      <td className="px-3 py-3 font-bold tabular-nums text-brand-900">
                        {row.status === "absent" ? "—" : (row.score ?? "—")}
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill status={row.status} />
                      </td>
                      <td className="px-3 py-3 text-xs text-text-muted">
                        {row.enteredBy ? shortUserId(row.enteredBy) : "—"}
                        {row.updatedAt ? (
                          <div>{formatRelative(row.updatedAt)}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setEditRow(row)}
                          className="text-sm font-bold text-brand-700 hover:text-brand-900"
                        >
                          Изм.
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 ? (
        <p className="text-sm text-text-muted">
          Показано {(page - 1) * pageSize + 1}–
          {Math.min(page * pageSize, filtered.length)} из {filtered.length}
          {pageCount > 1 ? (
            <span className="ml-3 inline-flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="font-semibold text-brand-700 disabled:opacity-40"
              >
                Пред
              </button>
              <span className="tabular-nums">{page}</span>
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className="font-semibold text-brand-700 disabled:opacity-40"
              >
                След
              </button>
            </span>
          ) : null}
        </p>
      ) : null}

      <AddResultDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        busy={busy}
        applications={applications}
        exams={exams}
        subjectName={subjectName}
        items={items}
        onSaved={async () => {
          await loadResults();
          setAddOpen(false);
        }}
        onError={setError}
        setBusy={setBusy}
        patchResult={patchResult}
        publishId={publishId}
        syncExam={async (eid: string) => {
          await fetch("/api/results/examiner/results/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ examId: eid }),
          });
          await loadResults();
        }}
      />

      <EditResultDrawer
        open={editRow !== null}
        row={editRow}
        onClose={() => setEditRow(null)}
        busy={busy}
        examsById={examsById}
        subjectName={subjectName}
        passLabel={
          editRow
            ? passByUserExam.get(`${editRow.userId}:${editRow.examId}`) || "—"
            : "—"
        }
        onSaved={async () => {
          await loadResults();
          setEditRow(null);
        }}
        onPublishRequest={(id) => {
          setEditRow(null);
          setPublishOneId(id);
        }}
        onError={setError}
        setBusy={setBusy}
        patchResult={patchResult}
      />

      <ConfirmDialog
        open={publishOneId !== null}
        onClose={() => setPublishOneId(null)}
        title="Публикация результата ЦТ"
        confirmLabel="Опубликовать"
        busy={busy}
        onConfirm={async () => {
          if (!publishOneId) return;
          setBusy(true);
          setError(null);
          try {
            await publishId(publishOneId);
            await loadResults();
            setPublishOneId(null);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Ошибка публикации");
          } finally {
            setBusy(false);
          }
        }}
      >
        После публикации балл станет виден абитуриенту. Продолжить?
      </ConfirmDialog>

      <ConfirmDialog
        open={batchPublishOpen}
        onClose={() => setBatchPublishOpen(false)}
        title="Массовая публикация результатов"
        confirmLabel={`Опубликовать (${draftSelectedIds.length})`}
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          setError(null);
          try {
            await publishBatchIds(draftSelectedIds);
            setSelected(new Set());
            await loadResults();
            setBatchPublishOpen(false);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Ошибка публикации");
          } finally {
            setBusy(false);
          }
        }}
      >
        Будут опубликованы только черновики с указанным баллом. Продолжить?
      </ConfirmDialog>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-[14px] border border-border bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
      <div className="text-xs font-bold uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums text-brand-900">
        {typeof value === "number" ? value : "—"}
      </div>
    </div>
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

function formatExamDateShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU");
}

function formatRelative(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const day = 86400000;
  if (diff < day) return "Сегодня";
  if (diff < day * 2) return "Вчера";
  return d.toLocaleDateString("ru-RU");
}

function motion({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

type DrawerOps = {
  busy: boolean;
  setBusy: (v: boolean) => void;
  onError: (m: string | null) => void;
  patchResult: (id: string, body: { score?: number | null; status?: string }) => Promise<void>;
};

function AddResultDrawer({
  open,
  onClose,
  busy,
  applications,
  exams,
  subjectName,
  items,
  onSaved,
  onError,
  setBusy,
  patchResult,
  publishId,
  syncExam,
}: DrawerOps & {
  open: boolean;
  onClose: () => void;
  applications: ExamApplication[];
  exams: ExamSession[];
  subjectName: (id: string) => string;
  items: CtResult[];
  onSaved: () => Promise<void>;
  publishId: (id: string) => Promise<void>;
  syncExam: (examId: string) => Promise<void>;
}) {
  const [appId, setAppId] = useState("");
  const [examSelect, setExamSelect] = useState("");
  const [attendance, setAttendance] = useState<"present" | "absent">("present");
  const [score, setScore] = useState("");
  const [comment, setComment] = useState("");

  const selectedApp = applications.find((a) => a.id === appId);

  useEffect(() => {
    if (!open) return;
    setAppId("");
    setExamSelect("");
    setAttendance("present");
    setScore("");
    setComment("");
  }, [open]);

  useEffect(() => {
    if (selectedApp?.examId) setExamSelect(selectedApp.examId);
  }, [selectedApp]);

  const examOptions = useMemo(() => {
    if (selectedApp?.exam) return [selectedApp.exam];
    return exams;
  }, [selectedApp, exams]);

  const selectedExam =
    examOptions.find((e) => e.id === examSelect) ||
    exams.find((e) => e.id === examSelect);

  const existingForExam = useMemo(() => {
    if (!selectedApp || !examSelect) return null;
    return (
      items.find((r) => r.userId === selectedApp.userId && r.examId === examSelect) ||
      null
    );
  }, [items, selectedApp, examSelect]);

  async function save(publish: boolean) {
    if (!selectedApp || !examSelect) {
      onError("Выберите абитуриента и экзамен");
      return;
    }
    setBusy(true);
    onError(null);
    try {
      await syncExam(examSelect);
      const res = await fetch(
        `/api/results/examiner/results?status=all&examId=${encodeURIComponent(examSelect)}`,
      );
      const json = (await res.json().catch(() => ({}))) as ExaminerResultsResponse;
      let row =
        json.items?.find(
          (r) => r.userId === selectedApp.userId && r.examId === examSelect,
        ) || existingForExam;

      if (!row) {
        throw new Error("Не удалось создать запись результата. Повторите синхронизацию.");
      }

      if (attendance === "absent") {
        await patchResult(row.id, { status: "absent", score: null });
      } else {
        const num = Number.parseInt(score.trim(), 10);
        if (Number.isNaN(num) || num < 0 || num > 100) {
          throw new Error("Балл от 0 до 100");
        }
        await patchResult(row.id, { score: num, status: "draft" });
        if (publish) await publishId(row.id);
      }

      if (comment.trim()) {
        try {
          localStorage.setItem(`ct-result-comment-${row.id}`, comment.trim());
        } catch {}
      }

      await onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Внесение результата ЦТ"
      widthClassName="max-w-lg"
      footer={
        <>
          <FormButton
            type="button"
            variant="secondary"
            className="w-auto px-4 py-2.5"
            onClick={onClose}
            disabled={busy}
          >
            Отмена
          </FormButton>
          <FormButton
            type="button"
            variant="secondary"
            className="w-auto px-4 py-2.5"
            disabled={busy}
            onClick={() => void save(false)}
          >
            Сохранить черновик
          </FormButton>
          <FormButton
            type="button"
            className="w-auto px-4 py-2.5"
            disabled={busy}
            onClick={() => void save(true)}
          >
            Сохранить и опубликовать
          </FormButton>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Найдите абитуриента, проверьте допуск и внесите балл.
        </p>

        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold text-text-secondary">Абитуриент</span>
          <select
            className={fieldClass}
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
          >
            <option value="">— выберите —</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.passNumber || shortUserId(app.userId)} · {shortUserId(app.userId)}
              </option>
            ))}
          </select>
        </label>

        {selectedApp ? (
          <div className="rounded-[10px] border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-900">
            Пропуск: {selectedApp.passNumber || "—"} · ID {selectedApp.userId}
          </div>
        ) : null}

        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold text-text-secondary">Экзамен из расписания</span>
          <select
            className={fieldClass}
            value={examSelect}
            onChange={(e) => setExamSelect(e.target.value)}
          >
            <option value="">—</option>
            {examOptions.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {subjectName(exam.subjectId)} · {formatExamWhen(exam.startsAt)}
                {exam.venue ? ` (${exam.venue.name})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold text-text-secondary">Явка на экзамен</span>
          <select
            className={fieldClass}
            value={attendance}
            onChange={(e) => setAttendance(e.target.value as "present" | "absent")}
          >
            <option value="present">Присутствовал</option>
            <option value="absent">Неявка</option>
          </select>
        </label>

        {attendance === "present" ? (
          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-text-secondary">Балл ЦТ (от 0 до 100)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="Например: 84"
              className={fieldClass}
            />
          </label>
        ) : null}

        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold text-text-secondary">Служебный комментарий эксперта</span>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Номер бланка, заметки комиссии…"
            className={fieldClass}
          />
        </label>

        {existingForExam && existingForExam.score !== null ? (
          <p className="rounded-[10px] border border-[#ffe7ba] bg-[#fff7e6] px-3 py-2 text-xs text-[#ad6800]">
            У абитуриента уже есть результат по{" "}
            {selectedExam ? subjectName(selectedExam.subjectId) : "предмету"} (
            {existingForExam.score} баллов).
          </p>
        ) : null}
      </div>
    </Drawer>
  );
}

function EditResultDrawer({
  open,
  row,
  onClose,
  busy,
  examsById,
  subjectName,
  passLabel,
  onSaved,
  onPublishRequest,
  onError,
  setBusy,
  patchResult,
}: DrawerOps & {
  open: boolean;
  row: CtResult | null;
  onClose: () => void;
  examsById: Map<string, ExamSession>;
  subjectName: (id: string) => string;
  passLabel: string;
  onSaved: () => Promise<void>;
  onPublishRequest: (id: string) => void;
}) {
  const [score, setScore] = useState("");
  const [reason, setReason] = useState("");
  const [attendance, setAttendance] = useState<"present" | "absent">("present");

  useEffect(() => {
    if (!row) return;
    setScore(row.score !== null && row.score !== undefined ? String(row.score) : "");
    setReason("");
    setAttendance(row.status === "absent" ? "absent" : "present");
  }, [row]);

  if (!row) return null;

  const exam = examsById.get(row.examId);
  const locked = row.status === "published";

  async function saveDraft() {
    if (!row) return;
    if (locked) {
      onError("Опубликованный результат нельзя изменить через API");
      return;
    }
    if (!reason.trim()) {
      onError("Укажите причину изменения");
      return;
    }
    setBusy(true);
    onError(null);
    try {
      if (attendance === "absent") {
        await patchResult(row.id, { status: "absent", score: null });
      } else {
        const num = Number.parseInt(score.trim(), 10);
        if (Number.isNaN(num) || num < 0 || num > 100) {
          throw new Error("Балл от 0 до 100");
        }
        await patchResult(row.id, { score: num });
      }
      try {
        localStorage.setItem(`ct-result-change-reason-${row.id}`, reason.trim());
      } catch {}
      await onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Изменение результата ЦТ"
      widthClassName="max-w-lg"
      footer={
        <>
          <FormButton
            type="button"
            variant="secondary"
            className="w-auto px-4 py-2.5"
            onClick={onClose}
            disabled={busy}
          >
            Отмена
          </FormButton>
          {row.status === "draft" && row.score !== null ? (
            <FormButton
              type="button"
              className="w-auto px-4 py-2.5"
              disabled={busy}
              onClick={() => onPublishRequest(row.id)}
            >
              Опубликовать
            </FormButton>
          ) : null}
          <FormButton
            type="button"
            className="w-auto px-4 py-2.5"
            disabled={busy || locked}
            onClick={() => void saveDraft()}
          >
            Сохранить
          </FormButton>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-[10px] bg-[#f8fafc] px-3 py-2 text-text-secondary">
          <div className="font-semibold text-text-primary">
            Участник {shortUserId(row.userId)}
          </div>
          <div>Пропуск: {passLabel}</div>
          {exam ? (
            <div className="mt-1">
              {subjectName(exam.subjectId)} · {formatExamWhen(exam.startsAt)}
            </div>
          ) : null}
        </div>

        <label className="block space-y-1.5">
          <span className="font-semibold text-text-secondary">Явка</span>
          <select
            className={fieldClass}
            value={attendance}
            disabled={locked}
            onChange={(e) => setAttendance(e.target.value as "present" | "absent")}
          >
            <option value="present">Присутствовал</option>
            <option value="absent">Неявка</option>
          </select>
        </label>

        {attendance === "present" ? (
          <label className="block space-y-1.5">
            <span className="font-semibold text-text-secondary">Новый балл ЦТ</span>
            <input
              type="number"
              min={0}
              max={100}
              value={score}
              disabled={locked}
              onChange={(e) => setScore(e.target.value)}
              className={fieldClass}
            />
          </label>
        ) : null}

        <label className="block space-y-1.5">
          <span className="font-semibold text-text-secondary">
            Причина изменения <span className="text-red-600">*</span>
          </span>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Опишите основание для корректировки"
            className={fieldClass}
          />
        </label>

        {locked ? (
          <p className="text-xs text-text-muted">
            Статус «Опубликован» — правка возможна только после согласования (API не поддерживает).
          </p>
        ) : null}
      </div>
    </Drawer>
  );
}