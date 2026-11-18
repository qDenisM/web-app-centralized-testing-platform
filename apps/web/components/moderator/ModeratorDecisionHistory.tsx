"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applicantDisplayName,
  formatSubmittedAt,
  type ModeratorVerificationItem,
} from "@/lib/moderator";
import type { CatalogSubject } from "@/lib/catalog";
import type { ExamApplication } from "@/lib/exam";
import { cn } from "@/lib/utils";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { FormButton } from "@/components/ui/FormButton";
import { Alert } from "@/components/ui/Alert";

type OpTypeFilter = "all" | "data" | "applications";
type DecisionFilter = "all" | "approved" | "returned" | "rejected";

type LogRow = {
  id: string;
  kind: "data" | "application";
  decidedAt: string | null;
  applicantName: string;
  operationType: string;
  fromStatus: string;
  toStatus: string;
  toTone: "ok" | "warn" | "bad" | "neutral";
  reason: string | null;
  moderator: string;
};

const PAGE_SIZE = 10;

function shortModeratorId(id: string | null | undefined): string {
  if (!id) return "—";
  return `ID ${id.slice(0, 8)}`;
}

function sameCalendarDay(iso: string | null, day: string): boolean {
  if (!iso || !day) return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const [y, m, dd] = day.split("-").map(Number);
  if (!y || !m || !dd) return true;
  return (
    d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === dd
  );
}

function verificationToRow(item: ModeratorVerificationItem): LogRow | null {
  if (!item.decidedAt) return null;
  if (
    item.status !== "approved" &&
    item.status !== "returned" &&
    item.status !== "rejected"
  ) {
    return null;
  }

  const toStatus =
    item.status === "approved"
      ? "Подтверждены"
      : item.status === "returned"
        ? "На исправление"
        : "Отказано";
  const toTone =
    item.status === "approved"
      ? "ok"
      : item.status === "returned"
        ? "warn"
        : "bad";

  return {
    id: `v-${item.id}`,
    kind: "data",
    decidedAt: item.decidedAt,
    applicantName: applicantDisplayName(item),
    operationType: "Проверка данных",
    fromStatus: "На проверке",
    toStatus,
    toTone,
    reason: item.rejectReason,
    moderator: shortModeratorId(item.lockedBy),
  };
}

function applicationToRow(
  item: ExamApplication,
  subjectName: (subjectId: string) => string,
  nameByUserId: Map<string, string>,
): LogRow | null {
  if (item.status !== "approved" && item.status !== "rejected") return null;

  const subject = item.exam?.subjectId
    ? subjectName(item.exam.subjectId)
    : "ЦТ";
  const toStatus = item.status === "approved" ? "Одобрена" : "Отклонена";
  const toTone = item.status === "approved" ? "ok" : "bad";

  return {
    id: `a-${item.id}`,
    kind: "application",
    // Exam applications have no decidedAt — use createdAt as best available timestamp.
    decidedAt: item.createdAt,
    applicantName:
      nameByUserId.get(item.userId) ||
      `Абитуриент ${item.userId.slice(0, 8)}`,
    operationType: `Заявка на ЦТ (${subject})`,
    fromStatus: "На рассмотрении",
    toStatus,
    toTone,
    reason: item.rejectReason,
    moderator: "—",
  };
}

function toToneClass(tone: LogRow["toTone"]): string {
  if (tone === "ok") return "text-green-800";
  if (tone === "warn") return "text-[#9A6B00]";
  if (tone === "bad") return "text-red-700";
  return "text-text-secondary";
}

function pageWindow(page: number, pageCount: number): Array<number | "…"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const set = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...set].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) out.push("…");
    out.push(sorted[i]!);
  }
  return out;
}

export function ModeratorDecisionHistory() {
  const [opType, setOpType] = useState<OpTypeFilter>("all");
  const [decision, setDecision] = useState<DecisionFilter>("all");
  const [date, setDate] = useState("");
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const verificationStatuses =
          decision === "all"
            ? (["approved", "returned", "rejected"] as const)
            : decision === "approved"
              ? (["approved"] as const)
              : decision === "returned"
                ? (["returned"] as const)
                : (["rejected"] as const);

        const ctStatus =
          decision === "all"
            ? "all"
            : decision === "approved"
              ? "approved"
              : decision === "rejected"
                ? "rejected"
                : null;

        const shouldLoadData = opType === "all" || opType === "data";
        const shouldLoadApps =
          (opType === "all" || opType === "applications") && ctStatus !== null;

        const [subjectsRes, ...rest] = await Promise.all([
          fetch("/api/catalog/subjects"),
          ...(shouldLoadData
            ? verificationStatuses.map((st) =>
                fetch(
                  `/api/applicant/moderator/verifications?status=${st}`,
                ),
              )
            : []),
          ...(shouldLoadApps
            ? [
                fetch(
                  `/api/exam/moderator/applications?status=${ctStatus}`,
                ),
              ]
            : []),
        ]);

        const subjectsJson = (await subjectsRes.json().catch(() => [])) as
          | CatalogSubject[]
          | { error?: string };
        const subjects = Array.isArray(subjectsJson) ? subjectsJson : [];
        const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
        const subjectName = (id: string) => subjectMap.get(id) || "предмет";

        let cursor = 0;
        const verificationBatches: ModeratorVerificationItem[][] = [];
        if (shouldLoadData) {
          for (let i = 0; i < verificationStatuses.length; i++) {
            const res = rest[cursor++]!;
            const json = (await res.json().catch(() => ({}))) as {
              items?: ModeratorVerificationItem[];
              error?: string;
            };
            if (!res.ok) {
              throw new Error(json.error || "Ошибка загрузки проверок данных");
            }
            verificationBatches.push(json.items || []);
          }
        }

        let applications: ExamApplication[] = [];
        if (shouldLoadApps) {
          const res = rest[cursor++]!;
          const json = (await res.json().catch(() => ({}))) as {
            items?: ExamApplication[];
            error?: string;
          };
          if (!res.ok) {
            throw new Error(json.error || "Ошибка загрузки заявок на ЦТ");
          }
          applications = (json.items || []).filter(
            (item) => item.status === "approved" || item.status === "rejected",
          );
        }

        if (cancelled) return;

        const verifications = verificationBatches.flat();
        const nameByUserId = new Map<string, string>();
        for (const item of verifications) {
          const name = applicantDisplayName(item);
          if (name) nameByUserId.set(item.profile.userId, name);
        }

        const nextRows: LogRow[] = [
          ...verifications
            .map(verificationToRow)
            .filter((row): row is LogRow => Boolean(row)),
          ...applications
            .map((item) => applicationToRow(item, subjectName, nameByUserId))
            .filter((row): row is LogRow => Boolean(row)),
        ].sort(
          (a, b) =>
            new Date(b.decidedAt || 0).getTime() -
            new Date(a.decidedAt || 0).getTime(),
        );

        setRows(nextRows);
        setPage(1);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Не удалось загрузить журнал",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [opType, decision]);

  const filtered = useMemo(
    () => rows.filter((row) => sameCalendarDay(row.decidedAt, date)),
    [rows, date],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const pageButtons = pageWindow(safePage, pageCount);

  function exportCsv() {
    const header = [
      "Дата и время",
      "Абитуриент",
      "Тип операции",
      "Было",
      "Стало",
      "Причина / комментарий",
      "Модератор",
    ];
    const csvRows = filtered.map((row) => [
      row.decidedAt ? new Date(row.decidedAt).toLocaleString("ru-RU") : "",
      row.applicantName,
      row.operationType,
      row.fromStatus,
      row.toStatus,
      row.reason || "",
      row.moderator,
    ]);
    const csv = [header, ...csvRows]
      .map((line) =>
        line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `moderator-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Журнал решений модератора
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Полный аудит подтверждений, отправок на исправление и отказов
          </p>
        </div>
        <FormButton
          type="button"
          variant="secondary"
          className="w-auto px-4 py-2.5"
          onClick={exportCsv}
          disabled={filtered.length === 0}
        >
          Экспорт в CSV
        </FormButton>
      </div>

      <section className="flex flex-wrap items-center gap-3 rounded-[14px] border border-border bg-white p-3 shadow-[var(--shadow-soft)] sm:p-4">
        <FilterSelect
          value={opType}
          onChange={(e) => setOpType(e.target.value as OpTypeFilter)}
          className="min-w-[220px] flex-1"
          aria-label="Тип операции"
        >
          <option value="all">Все типы (Данные и Заявки)</option>
          <option value="data">Проверка данных</option>
          <option value="applications">Заявки на ЦТ</option>
        </FilterSelect>
        <FilterSelect
          value={decision}
          onChange={(e) => setDecision(e.target.value as DecisionFilter)}
          className="min-w-[160px] flex-1"
          aria-label="Решение"
        >
          <option value="all">Все решения</option>
          <option value="approved">Подтверждено / одобрено</option>
          <option value="returned">На исправление</option>
          <option value="rejected">Отказано</option>
        </FilterSelect>
        <label className="min-w-[150px] flex-1">
          <span className="sr-only">Дата</span>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <p className="ml-auto text-sm text-text-muted">
          Записей в архиве: {filtered.length}
        </p>
      </section>

      {error ? (
        <Alert compact>{error}</Alert>
      ) : null}

      <section className="overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-[#f8fafc] text-xs font-bold uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-3">Дата и время</th>
                <th className="px-4 py-3">Абитуриент</th>
                <th className="px-4 py-3">Тип операции</th>
                <th className="px-4 py-3">Было → Стало</th>
                <th className="px-4 py-3">Причина / комментарий</th>
                <th className="px-4 py-3">Модератор</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-text-muted">
                    Загрузка журнала…
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-text-muted"
                  >
                    Записей не найдено.
                  </td>
                </tr>
              ) : (
                pageItems.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                      {formatSubmittedAt(row.decidedAt)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-text-primary">
                      {row.applicantName}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {row.operationType}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <span>{row.fromStatus}</span>
                      <span className="mx-1.5 text-text-muted">→</span>
                      <span className={cn("font-semibold", toToneClass(row.toTone))}>
                        {row.toStatus}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-text-secondary">
                      {row.reason || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                      {row.moderator}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-xs text-text-muted">
              Показано {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filtered.length)} из{" "}
              {filtered.length}
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-[8px] border border-border px-2.5 py-1.5 text-xs font-bold text-brand-800 disabled:opacity-40"
              >
                Пред
              </button>
              {pageButtons.map((btn, idx) =>
                btn === "…" ? (
                  <span
                    key={`e-${idx}`}
                    className="px-1 text-xs text-text-muted"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => setPage(btn)}
                    className={cn(
                      "min-w-8 rounded-[8px] border px-2.5 py-1.5 text-xs font-bold",
                      safePage === btn
                        ? "border-brand-700 bg-brand-700 text-white"
                        : "border-border text-brand-800 hover:bg-[#f4f7f9]",
                    )}
                  >
                    {btn}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className="rounded-[8px] border border-border px-2.5 py-1.5 text-xs font-bold text-brand-800 disabled:opacity-40"
              >
                След
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
