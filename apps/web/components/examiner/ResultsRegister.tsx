"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Alert } from "@/components/ui/Alert";
import { KpiCard } from "@/components/ui/KpiCard";
import { ResultStatusBadge } from "@/components/ui/StatusBadge";

type ScopeTab = "all" | "mine";

type ResultsRegisterProps = {
  subjects: CatalogSubject[];
};

type ChangeHistoryEntry = {
  at: string;
  from: number | null;
  to: number | null;
  reason?: string;
  kind: "initial" | "change";
  by?: string | null;
};

const fieldClass =
  "w-full rounded-[10px] border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const HISTORY_KEY = (id: string) => `ct-result-history-${id}`;
const COMMENT_KEY = (id: string) => `ct-result-comment-${id}`;
const REASON_KEY = (id: string) => `ct-result-change-reason-${id}`;

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

  const appsByUser = useMemo(() => {
    const map = new Map<string, ExamApplication[]>();
    for (const app of applications) {
      const list = map.get(app.userId) || [];
      list.push(app);
      map.set(app.userId, list);
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
      return json.items || [];
    } catch {
      setApplications([]);
      return [];
    }
  }, []);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Ensure result rows exist for newly re-approved applications.
      await fetch("/api/results/examiner/results/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await loadApplications();

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
  }, [scope, loadApplications]);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

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

  const approvedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const app of applications) {
      set.add(`${app.userId}:${app.examId}`);
    }
    return set;
  }, [applications]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((row) => {
      // Hide rows for revoked applications (rejected / pending / cancelled).
      if (
        approvedKeys.size > 0 &&
        !approvedKeys.has(`${row.userId}:${row.examId}`)
      ) {
        return false;
      }
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      const exam = examsById.get(row.examId);
      if (subjectFilter && exam?.subjectId !== subjectFilter) return false;
      if (venueFilter && exam?.venue?.name !== venueFilter) return false;
      const pass = passByUserExam.get(`${row.userId}:${row.examId}`) || "";
      const hay = `${row.userId} ${pass}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      return true;
    });
  }, [
    items,
    search,
    statusFilter,
    subjectFilter,
    venueFilter,
    examsById,
    passByUserExam,
    approvedKeys,
  ]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const shownFrom = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const shownTo = Math.min(page * pageSize, filtered.length);

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
      return { subject: "—", date: "—", venueMain: "—", venueSub: "", subjectId: "" };
    }
    const venueMain = exam.venue?.name || "—";
    const venueSub = exam.venue
      ? [exam.venue.city, exam.venue.address].filter(Boolean).join(", ")
      : "";
    return {
      subject: subjectName(exam.subjectId),
      date: formatExamDateShort(exam.startsAt),
      venueMain,
      venueSub,
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
            Внесение, аудит и публикация баллов по всем пунктам проведения тестирования
          </p>
        </div>
        <FormButton
          type="button"
          className="w-auto px-4 py-2.5"
          onClick={() => {
            void loadResults();
            setAddOpen(true);
          }}
        >
          + Добавить результат
        </FormButton>
      </div>

      <div className="inline-flex rounded-[10px] border border-border bg-white p-1">
        <button
          type="button"
          onClick={() => setScope("all")}
          className={cn(
            "rounded-[8px] px-4 py-2 text-sm font-bold transition-colors",
            scope === "all"
              ? "bg-brand-700 text-white"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          Все результаты по РБ
        </button>
        <button
          type="button"
          onClick={() => setScope("mine")}
          className={cn(
            "rounded-[8px] px-4 py-2 text-sm font-bold transition-colors",
            scope === "mine"
              ? "bg-brand-700 text-white"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          Внесённые мной
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          compact
          label="Всего"
          value={typeof counts?.all === "number" ? counts.all : "—"}
        />
        <KpiCard
          compact
          label="Не внесено"
          value={typeof counts?.missing === "number" ? counts.missing : "—"}
        />
        <KpiCard
          compact
          label="Черновиков"
          value={typeof counts?.draft === "number" ? counts.draft : "—"}
        />
        <KpiCard
          compact
          label="Опубликовано"
          value={typeof counts?.published === "number" ? counts.published : "—"}
        />
      </div>

      <div className="rounded-[14px] border border-border bg-white p-3 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-text-muted">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по ФИО, email или номеру пропуска…"
              className={cn(fieldClass, "pl-10")}
              aria-label="Поиск по результатам"
            />
          </div>
          <FilterSelect
            className="min-w-[160px] lg:w-44"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            aria-label="Фильтр по предмету"
          >
            <option value="">Все предметы</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            className="min-w-[160px] lg:w-48"
            value={venueFilter}
            onChange={(e) => setVenueFilter(e.target.value)}
            aria-label="Фильтр по пункту ЦТ"
          >
            <option value="">Все пункты ЦТ</option>
            {venues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            className="min-w-[150px] lg:w-44"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Фильтр по статусу"
          >
            <option value="all">Все статусы</option>
            <option value="missing">Не внесён</option>
            <option value="draft">Черновик</option>
            <option value="absent">Неявка</option>
            <option value="published">Опубликован</option>
          </FilterSelect>
        </div>
      </div>

      {draftSelectedIds.length > 0 ? (
        <div>
          <FormButton
            type="button"
            className="w-auto px-4 py-2"
            onClick={() => setBatchPublishOpen(true)}
          >
            Опубликовать выбранные ({draftSelectedIds.length})
          </FormButton>
        </div>
      ) : null}

      {error ? (
        <Alert compact>{error}</Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка реестра…</p>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
          <div className="overflow-x-auto">
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
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => setEditRow(row)}
                            className="text-left font-semibold text-brand-700 hover:text-brand-900 hover:underline"
                          >
                            Участник {shortUserId(row.userId)}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-text-secondary">{pass}</td>
                        <td className="px-3 py-3">{meta.subject}</td>
                        <td className="px-3 py-3 text-text-secondary">{meta.date}</td>
                        <td className="px-3 py-3">
                          <div className="text-text-primary">{meta.venueMain}</div>
                          {meta.venueSub ? (
                            <div className="text-xs text-text-muted">{meta.venueSub}</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 font-bold tabular-nums text-brand-900">
                          {row.status === "absent" ? "—" : (row.score ?? "—")}
                        </td>
                        <td className="px-3 py-3">
                          <ResultStatusBadge status={row.status} />
                        </td>
                        <td className="px-3 py-3 text-xs text-text-muted">
                          <div>
                            {row.enteredBy ? shortUserId(row.enteredBy) : "—"}
                            {row.updatedAt ? `, ${formatRelative(row.updatedAt)}` : ""}
                          </div>
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

          {filtered.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-text-muted">
              <span>
                Показано {shownFrom}–{shownTo} из {filtered.length}
              </span>
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-[8px] px-2.5 py-1.5 font-semibold text-text-secondary hover:bg-[#f4f7f9] disabled:opacity-40"
                >
                  Пред
                </button>
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-[8px] bg-brand-700 px-2.5 text-sm font-bold text-white tabular-nums">
                  {page}
                </span>
                <button
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  className="rounded-[8px] px-2.5 py-1.5 font-semibold text-text-secondary hover:bg-[#f4f7f9] disabled:opacity-40"
                >
                  След
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <AddResultDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        busy={busy}
        applications={applications}
        appsByUser={appsByUser}
        exams={exams}
        subjectName={subjectName}
        items={items}
        onOpenExisting={(row) => {
          setAddOpen(false);
          setEditRow(row);
        }}
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
        onError={setError}
        setBusy={setBusy}
        patchResult={patchResult}
      />

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

function applicantLabel(userId: string, pass: string) {
  if (pass && pass !== "—") return `${pass} · ${shortUserId(userId)}`;
  return `Участник ${shortUserId(userId)}`;
}

function formatExamDateShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU");
}

function formatRelative(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const diff = Date.now() - d.getTime();
  const day = 86400000;
  if (diff < day && d.getDate() === new Date().getDate()) return `Сегодня, ${time}`;
  if (diff < day * 2) return `Вчера, ${time}`;
  return `${d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}, ${time}`;
}

function formatHistoryWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}, ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
}

function readHistory(id: string): ChangeHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY(id));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChangeHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(id: string, entries: ChangeHistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY(id), JSON.stringify(entries));
  } catch {
    /* ignore quota */
  }
}

function appendHistory(id: string, entry: ChangeHistoryEntry) {
  const prev = readHistory(id);
  writeHistory(id, [entry, ...prev].slice(0, 50));
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
  appsByUser,
  exams,
  subjectName,
  items,
  onOpenExisting,
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
  appsByUser: Map<string, ExamApplication[]>;
  exams: ExamSession[];
  subjectName: (id: string) => string;
  items: CtResult[];
  onOpenExisting: (row: CtResult) => void;
  onSaved: () => Promise<void>;
  publishId: (id: string) => Promise<void>;
  syncExam: (examId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState("");
  const [examSelect, setExamSelect] = useState("");
  const [attendance, setAttendance] = useState<"present" | "absent">("present");
  const [score, setScore] = useState("");
  const [comment, setComment] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setUserId("");
    setExamSelect("");
    setAttendance("present");
    setScore("");
    setComment("");
    setSuggestOpen(false);
  }, [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!searchWrapRef.current?.contains(e.target as Node)) setSuggestOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const uniqueApplicants = useMemo(() => {
    const seen = new Set<string>();
    const list: { userId: string; pass: string; label: string }[] = [];
    for (const app of applications) {
      if (seen.has(app.userId)) continue;
      seen.add(app.userId);
      const pass = app.passNumber || "—";
      list.push({
        userId: app.userId,
        pass,
        label: applicantLabel(app.userId, pass),
      });
    }
    return list;
  }, [applications]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return uniqueApplicants.slice(0, 8);
    return uniqueApplicants
      .filter((a) => `${a.label} ${a.pass} ${a.userId}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [uniqueApplicants, query]);

  const userApps = userId ? appsByUser.get(userId) || [] : [];
  const primaryApp = userApps[0];

  useEffect(() => {
    if (!userId) {
      setExamSelect("");
      return;
    }
    if (primaryApp?.examId) setExamSelect(primaryApp.examId);
  }, [userId, primaryApp?.examId]);

  const examOptions = useMemo(() => {
    if (userApps.length > 0) {
      return userApps
        .map((a) => a.exam)
        .filter((e): e is ExamSession => Boolean(e));
    }
    return exams;
  }, [userApps, exams]);

  const selectedExam =
    examOptions.find((e) => e.id === examSelect) ||
    exams.find((e) => e.id === examSelect);

  const enrolledSubjects = useMemo(() => {
    const names = new Set<string>();
    for (const app of userApps) {
      const sid = app.exam?.subjectId;
      if (sid) names.add(subjectName(sid));
    }
    return [...names];
  }, [userApps, subjectName]);

  const existingForExam = useMemo(() => {
    if (!userId || !examSelect) return null;
    return items.find((r) => r.userId === userId && r.examId === examSelect) || null;
  }, [items, userId, examSelect]);

  function pickApplicant(opt: { userId: string; pass: string; label: string }) {
    setUserId(opt.userId);
    setQuery(opt.label);
    setSuggestOpen(false);
  }

  async function save(publish: boolean) {
    if (!userId || !examSelect) {
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
        json.items?.find((r) => r.userId === userId && r.examId === examSelect) ||
        existingForExam;

      if (!row) {
        throw new Error("Не удалось создать запись результата. Повторите синхронизацию.");
      }

      const prevScore = row.score;

      if (attendance === "absent") {
        if (row.status === "published") {
          throw new Error(
            "Нельзя отметить неявку для опубликованного результата",
          );
        }
        await patchResult(row.id, { status: "absent", score: null });
      } else {
        const num = Number.parseInt(score.trim(), 10);
        if (Number.isNaN(num) || num < 0 || num > 100) {
          throw new Error("Балл от 0 до 100");
        }
        // Published rows: score-only correction (status change is forbidden).
        if (row.status === "published") {
          await patchResult(row.id, { score: num });
        } else {
          await patchResult(row.id, { score: num, status: "draft" });
          if (publish) await publishId(row.id);
        }

        if (prevScore === null || prevScore === undefined) {
          appendHistory(row.id, {
            kind: "initial",
            from: null,
            to: num,
            at: new Date().toISOString(),
            by: null,
          });
        }
      }

      if (comment.trim()) {
        try {
          localStorage.setItem(COMMENT_KEY(row.id), comment.trim());
        } catch {
          /* ignore */
        }
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
      subtitle="Поиск абитуриента, верификация записи и установка балла"
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
        <div ref={searchWrapRef} className="relative space-y-1.5 text-sm">
          <label className="block font-semibold text-text-secondary" htmlFor="add-applicant">
            Абитуриент (ФИО, email или пропуск)
          </label>
          <input
            id="add-applicant"
            type="search"
            autoComplete="off"
            className={fieldClass}
            value={query}
            placeholder="Начните вводить пропуск или ID…"
            onChange={(e) => {
              setQuery(e.target.value);
              setSuggestOpen(true);
              if (userId) setUserId("");
            }}
            onFocus={() => setSuggestOpen(true)}
          />
          {suggestOpen && suggestions.length > 0 ? (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-[10px] border border-border bg-white py-1 shadow-[var(--shadow-soft)]">
              {suggestions.map((opt) => (
                <li key={opt.userId}>
                  <button
                    type="button"
                    className="flex w-full flex-col px-3 py-2 text-left hover:bg-[#f4f7f9]"
                    onClick={() => pickApplicant(opt)}
                  >
                    <span className="text-sm font-semibold text-text-primary">{opt.label}</span>
                    <span className="text-xs text-text-muted">
                      {opt.pass !== "—" ? opt.pass : shortUserId(opt.userId)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {userId ? (
          <div className="rounded-[10px] border border-brand-200 bg-brand-50 px-3.5 py-3 text-sm text-brand-900">
            <div className="font-semibold">
              {primaryApp?.passNumber || shortUserId(userId)}
              <span className="font-normal text-brand-800">
                {" · "}
                ID {shortUserId(userId)}
              </span>
            </div>
            <div className="mt-1 text-xs text-brand-800">
              Записан на ЦТ:{" "}
              {enrolledSubjects.length > 0 ? enrolledSubjects.join(", ") : "—"}
            </div>
          </div>
        ) : null}

        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold text-text-secondary">Экзамен из расписания</span>
          <FilterSelect
            value={examSelect}
            onChange={(e) => setExamSelect(e.target.value)}
            disabled={!userId}
          >
            <option value="">—</option>
            {examOptions.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {subjectName(exam.subjectId)} • {formatExamDateShort(exam.startsAt)}
                {exam.venue ? ` (${exam.venue.name})` : ""}
              </option>
            ))}
          </FilterSelect>
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold text-text-secondary">Явка на экзамен</span>
          <FilterSelect
            value={attendance}
            onChange={(e) => setAttendance(e.target.value as "present" | "absent")}
          >
            <option value="present">Присутствовал</option>
            <option value="absent">Неявка</option>
          </FilterSelect>
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
            placeholder="Номер бланка РИКЗ, замечания комиссии…"
            className={fieldClass}
          />
        </label>

        {existingForExam &&
        (existingForExam.score !== null || existingForExam.status !== "missing") ? (
          <div className="rounded-[10px] border border-[#ffe7ba] bg-[#fff7e6] px-3.5 py-2.5 text-sm text-[#ad6800]">
            У абитуриента уже есть результат по{" "}
            {selectedExam ? subjectName(selectedExam.subjectId) : "предмету"}
            {existingForExam.score !== null ? ` (${existingForExam.score} баллов)` : ""}.{" "}
            <button
              type="button"
              className="font-bold underline underline-offset-2 hover:text-[#874d00]"
              onClick={() => onOpenExisting(existingForExam)}
            >
              Открыть существующий →
            </button>
          </div>
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
}) {
  const [score, setScore] = useState("");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<ChangeHistoryEntry[]>([]);

  useEffect(() => {
    if (!row) return;
    setScore(row.score !== null && row.score !== undefined ? String(row.score) : "");
    setReason("");
    const stored = readHistory(row.id);
    const hasInitial = stored.some((h) => h.kind === "initial");
    const seed: ChangeHistoryEntry[] = [...stored];
    if (!hasInitial && (row.score !== null || row.createdAt)) {
      seed.push({
        kind: "initial",
        from: null,
        to: row.score,
        at: row.createdAt,
        by: row.enteredBy,
      });
    }
    setHistory(seed);
  }, [row]);

  if (!row) return null;

  const exam = examsById.get(row.examId);
  const subject = exam ? subjectName(exam.subjectId) : "—";
  const applicant =
    passLabel && passLabel !== "—"
      ? passLabel
      : `Участник ${shortUserId(row.userId)}`;
  const published = row.status === "published";

  const currentSummary = (() => {
    if (row.status === "absent") return `Неявка • ${resultStatusLabel(row.status)}`;
    if (row.score === null || row.score === undefined) {
      return resultStatusLabel(row.status);
    }
    return `${row.score} баллов • ${resultStatusLabel(row.status)}`;
  })();

  async function saveChanges() {
    if (!row) return;
    if (!reason.trim()) {
      onError("Укажите причину изменения");
      return;
    }
    const num = Number.parseInt(score.trim(), 10);
    if (Number.isNaN(num) || num < 0 || num > 100) {
      onError("Балл от 0 до 100");
      return;
    }
    setBusy(true);
    onError(null);
    try {
      const prev = row.score;
      await patchResult(row.id, { score: num });
      appendHistory(row.id, {
        kind: "change",
        from: prev,
        to: num,
        reason: reason.trim(),
        at: new Date().toISOString(),
        by: null,
      });
      try {
        localStorage.setItem(REASON_KEY(row.id), reason.trim());
      } catch {
        /* ignore */
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
      title="Изменение результата ЦТ"
      subtitle={`${applicant} • ${subject}`}
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
            className="w-auto px-4 py-2.5"
            disabled={busy}
            onClick={() => void saveChanges()}
          >
            Сохранить изменения
          </FormButton>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        {published ? (
          <div className="rounded-[10px] border border-[#ffe7ba] bg-[#fff7e6] px-3.5 py-2.5 text-[#ad6800]">
            Результат уже опубликован. Абитуриент видит балл в личном кабинете. После
            изменения ему будет отправлено уведомление.
          </div>
        ) : null}

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Текущий результат
          </div>
          <div className="mt-1 text-lg font-extrabold text-brand-900">{currentSummary}</div>
          {exam ? (
            <p className="mt-1 text-xs text-text-muted">
              Пропуск: {passLabel} · {formatExamWhen(exam.startsAt)}
            </p>
          ) : null}
        </div>

        <label className="block space-y-1.5">
          <span className="font-semibold text-text-secondary">Новый балл (0–100)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="font-semibold text-text-secondary">
            Обязательная причина изменения
          </span>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Перепроверка бланка части Б по решению апелляционной комиссии…"
            className={fieldClass}
          />
        </label>

        <div className="border-t border-border pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-text-muted">
            История изменений по данному бланку
          </h3>
          {history.length === 0 ? (
            <p className="mt-3 text-xs text-text-muted">
              Записей истории пока нет. После сохранения правки появятся здесь.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {history.map((entry, idx) => (
                <li key={`${entry.at}-${idx}`} className="text-sm">
                  <div className="font-bold text-text-primary">
                    {entry.kind === "initial"
                      ? `Первичный ввод${entry.to !== null && entry.to !== undefined ? ` (${entry.to} баллов)` : ""}`
                      : `Было ${entry.from ?? "—"} → стало ${entry.to ?? "—"}`}
                  </div>
                  <div className="mt-0.5 text-xs text-text-muted">
                    {formatHistoryWhen(entry.at)}
                    {entry.by ? ` • ${shortUserId(entry.by)}` : ""}
                  </div>
                  {entry.reason ? (
                    <p className="mt-1 text-xs text-text-secondary">{entry.reason}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Drawer>
  );
}
