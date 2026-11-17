"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogSubject } from "@/lib/catalog";
import {
  formatExamWhen,
  type ExamApplication,
  type ExamSession,
  type ExamVenue,
} from "@/lib/exam";
import {
  moderatorStatusLabel,
  type ModeratorVerificationItem,
} from "@/lib/moderator";
import { cn } from "@/lib/utils";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { FormButton } from "@/components/ui/FormButton";
import { Modal } from "@/components/ui/Modal";

type Tab = "all" | "pending" | "approved" | "rejected";

function parseTab(value: string | null): Tab {
  if (
    value === "pending" ||
    value === "approved" ||
    value === "rejected" ||
    value === "all"
  ) {
    return value;
  }
  return "all";
}

type QueueResponse = {
  items: ExamApplication[];
  counts: {
    all: number;
    pending: number;
    approved: number;
    rejected: number;
  };
};

type ApplicantMeta = {
  name: string | null;
  passport: string | null;
  verificationId: string | null;
  verificationStatus: string | null;
};

const PAGE_SIZE = 5;

const REJECT_REASONS = [
  { value: "no_seats", label: "В пункте тестирования закончились свободные места" },
  { value: "docs", label: "Неполный пакет документов" },
  { value: "passport", label: "Паспортные данные не подтверждены" },
  { value: "duplicate", label: "Дублирующая запись на сеанс" },
  { value: "other", label: "Другое" },
];

function ctAppStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "На рассмотрении";
    case "approved":
      return "Одобрена";
    case "rejected":
      return "Отклонена";
    case "cancelled":
      return "Отменена";
    default:
      return status;
  }
}

function ctAppStatusClass(status: string): string {
  switch (status) {
    case "pending":
      return "bg-[#FFF4D6] text-[#9A6B00]";
    case "approved":
      return "bg-[#E8F7EE] text-[#1B7A3E]";
    case "rejected":
      return "bg-[#fdecec] text-[#c94343]";
    default:
      return "bg-[#f4f7f9] text-text-secondary";
  }
}

function dataStatusLabel(status: string | null): string {
  switch (status) {
    case "approved":
      return "Подтверждены";
    case "pending":
      return "На проверке";
    case "returned":
      return "На исправлении";
    case "rejected":
      return "Отказано";
    default:
      return "Нет данных";
  }
}

function dataStatusClass(status: string | null): string {
  switch (status) {
    case "approved":
      return "bg-[#E8F7EE] text-[#1B7A3E]";
    case "pending":
      return "bg-[#E8F1F8] text-[#2B6B8A]";
    case "returned":
      return "bg-[#FFF4D6] text-[#9A6B00]";
    case "rejected":
      return "bg-[#fdecec] text-[#c94343]";
    default:
      return "bg-[#f4f7f9] text-text-secondary";
  }
}

function formatShortDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatHistoryStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function appDisplayId(row: ExamApplication): string {
  if (row.passNumber) return row.passNumber;
  const year = row.exam?.startsAt
    ? new Date(row.exam.startsAt).getFullYear()
    : new Date(row.createdAt).getFullYear();
  return `СТ-${year}-${row.id.slice(0, 3).toUpperCase()}`;
}

function applicantDisplayName(
  userId: string,
  meta: ApplicantMeta | undefined,
): string {
  return meta?.name?.trim() || `Абитуриент ${userId.slice(0, 8)}…`;
}

function selectedWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "выбранную заявку";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "выбранные заявки";
  }
  return "выбранных заявок";
}

export function ModeratorCtApplications() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() =>
    parseTab(searchParams.get("status")),
  );
  const [subjectId, setSubjectId] = useState("");
  const [venueId, setVenueId] = useState("");
  const [subjects, setSubjects] = useState<CatalogSubject[]>([]);
  const [venues, setVenues] = useState<ExamVenue[]>([]);
  const [data, setData] = useState<QueueResponse | null>(null);
  const [allApps, setAllApps] = useState<ExamApplication[]>([]);
  const [applicantByUser, setApplicantByUser] = useState<
    Record<string, ApplicantMeta>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [reviewApp, setReviewApp] = useState<ExamApplication | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ExamApplication | null>(null);
  const [rejectReasonKey, setRejectReasonKey] = useState(REJECT_REASONS[0].value);
  const [rejectComment, setRejectComment] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);

  const subjectName = useCallback(
    (id: string) => subjects.find((s) => s.id === id)?.name || "Предмет",
    [subjects],
  );

  const loadLookups = useCallback(async () => {
    try {
      const [subjectsRes, examsRes, verRes] = await Promise.all([
        fetch("/api/catalog/subjects"),
        fetch("/api/exam/exams"),
        fetch("/api/applicant/moderator/verifications?status=all"),
      ]);

      if (subjectsRes.ok) {
        const json = (await subjectsRes.json().catch(() => [])) as
          | CatalogSubject[]
          | { error?: string };
        if (Array.isArray(json)) setSubjects(json);
      }

      if (examsRes.ok) {
        const json = (await examsRes.json().catch(() => [])) as
          | ExamSession[]
          | { error?: string };
        if (Array.isArray(json)) {
          const map = new Map<string, ExamVenue>();
          for (const exam of json) {
            if (exam.venue) map.set(exam.venue.id, exam.venue);
          }
          setVenues(Array.from(map.values()).sort((a, b) =>
            a.name.localeCompare(b.name, "ru"),
          ));
        }
      }

      if (verRes.ok) {
        const json = (await verRes.json().catch(() => null)) as {
          items?: ModeratorVerificationItem[];
        } | null;
        const map: Record<string, ApplicantMeta> = {};
        for (const item of json?.items || []) {
          const passport =
            item.profile.passportSeries && item.profile.passportNumber
              ? `${item.profile.passportSeries} ${item.profile.passportNumber}`
              : null;
          map[item.profile.userId] = {
            name: item.profile.graduateName,
            passport,
            verificationId: item.id,
            verificationStatus: item.status,
          };
        }
        setApplicantByUser(map);
      }
    } catch {
      // Lookups are optional enrichment; queue still works without them.
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status: tab });
      if (subjectId) params.set("subjectId", subjectId);
      if (venueId) params.set("venueId", venueId);

      const [res, allRes] = await Promise.all([
        fetch(`/api/exam/moderator/applications?${params.toString()}`),
        fetch("/api/exam/moderator/applications?status=all"),
      ]);

      const json = (await res.json().catch(() => ({}))) as QueueResponse & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "Не удалось загрузить заявки");
        return;
      }
      setData(json);
      setSelected(new Set());
      setPage(1);

      if (allRes.ok) {
        const allJson = (await allRes.json().catch(() => ({}))) as QueueResponse;
        setAllApps(allJson.items || []);
      }
    } catch {
      setError("Сеть недоступна. Проверьте exam-service.");
    } finally {
      setLoading(false);
    }
  }, [tab, subjectId, venueId]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = data?.items || [];
  const counts = data?.counts;

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const sessionCard = useMemo(() => {
    if (items.length === 0) return null;
    const examIds = new Set(items.map((i) => i.examId));
    if (examIds.size !== 1) return null;
    const sample = items.find((i) => i.exam)?.exam;
    if (!sample) return null;
    const capacity = sample.capacity || 0;
    const taken = sample.seatsTaken || 0;
    const pct = capacity > 0 ? Math.round((taken / capacity) * 100) : 0;
    return {
      subject: subjectName(sample.subjectId),
      when: sample.startsAt
        ? formatExamWhen(sample.startsAt).replace(" г. в ", ", ")
        : "—",
      venue: sample.venue?.name || "—",
      approved: taken,
      capacity,
      pct,
    };
  }, [items, subjectName]);

  function isDataConfirmed(userId: string): boolean {
    return applicantByUser[userId]?.verificationStatus === "approved";
  }

  function canSelectRow(row: ExamApplication): boolean {
    return row.status === "pending" && isDataConfirmed(row.userId);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    const selectableIds = pageItems.filter(canSelectRow).map((row) => row.id);
    if (selectableIds.length === 0) return;
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = selectableIds.every((id) => next.has(id));
      if (allSelected) {
        for (const id of selectableIds) next.delete(id);
      } else {
        for (const id of selectableIds) next.add(id);
      }
      return next;
    });
  }

  function rejectReasonText() {
    const base =
      REJECT_REASONS.find((r) => r.value === rejectReasonKey)?.label || "";
    return rejectComment.trim()
      ? `${base}: ${rejectComment.trim()}`
      : base;
  }

  async function decide(
    id: string,
    decision: "approved" | "rejected",
    reason?: string,
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/exam/moderator/applications/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reason: decision === "rejected" ? reason : undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось принять решение");
        return;
      }
      setRejectTarget(null);
      setReviewApp(null);
      await load();
    } catch {
      setError("Ошибка сети при решении по заявке");
    } finally {
      setBusy(false);
    }
  }

  async function approveBatch() {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/exam/moderator/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось одобрить пакетно");
        return;
      }
      setBulkOpen(false);
      await load();
    } catch {
      setError("Ошибка сети при пакетном одобрении");
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "all", label: "Все", count: counts?.all },
    { id: "pending", label: "На рассмотрении", count: counts?.pending },
    { id: "approved", label: "Одобрены", count: counts?.approved },
    { id: "rejected", label: "Отклонены", count: counts?.rejected },
  ];

  const reviewMeta = reviewApp
    ? applicantByUser[reviewApp.userId]
    : undefined;
  const otherApps = reviewApp
    ? allApps.filter(
        (a) => a.userId === reviewApp.userId && a.id !== reviewApp.id,
      )
    : [];

  const selectableOnPage = pageItems.filter(canSelectRow);
  const allPageSelected =
    selectableOnPage.length > 0 &&
    selectableOnPage.every((r) => selected.has(r.id));
  const reviewCanApprove =
    reviewApp?.status === "pending" &&
    isDataConfirmed(reviewApp.userId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Заявки абитуриентов на сдачу ЦТ
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Одобрение мест доступно только при подтверждённых данных абитуриента
          </p>
        </div>
        <FormButton
          type="button"
          variant="secondary"
          className="w-auto"
          onClick={() => setBulkOpen(true)}
          disabled={busy || selected.size === 0}
        >
          Одобрить выбранные ({selected.size})
        </FormButton>
      </div>

      {sessionCard ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-brand-200 bg-[#EAF4F8] px-5 py-4">
          <div>
            <p className="text-sm font-bold text-brand-900">
              {sessionCard.subject} • {sessionCard.when} ({sessionCard.venue})
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Одобрено {sessionCard.approved} из {sessionCard.capacity} мест
            </p>
          </div>
          <div className="min-w-[180px] flex-1 max-w-xs">
            <div className="mb-1 flex justify-end text-xs font-semibold text-brand-800">
              {sessionCard.pct}% мест занято
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/80">
              <div
                className="h-full rounded-full bg-brand-700"
                style={{ width: `${Math.min(sessionCard.pct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-[10px] px-3.5 py-2 text-sm font-semibold",
              tab === item.id
                ? "bg-brand-100 text-brand-900"
                : "border border-border bg-white text-text-secondary",
            )}
          >
            {item.label}
            {typeof item.count === "number" ? ` (${item.count})` : ""}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          <FilterSelect
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="min-w-[160px]"
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
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            className="min-w-[160px]"
            aria-label="Фильтр по пункту ЦТ"
          >
            <option value="">Все пункты ЦТ</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </FilterSelect>
        </div>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="rounded-[14px] border border-border bg-white p-6 text-sm text-text-muted">
          Заявок в этом статусе нет.
        </p>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-border bg-[#f8fafc] text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAllOnPage}
                      aria-label="Выбрать все на странице"
                      disabled={selectableOnPage.length === 0}
                    />
                  </th>
                  <th className="px-4 py-3">Абитуриент</th>
                  <th className="px-4 py-3">Предмет ЦТ</th>
                  <th className="px-4 py-3">Дата и время</th>
                  <th className="px-4 py-3">Пункт сдачи</th>
                  <th className="px-4 py-3">Подана</th>
                  <th className="px-4 py-3">Статус данных</th>
                  <th className="px-4 py-3">Статус заявки</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => {
                  const meta = applicantByUser[row.userId];
                  const name = applicantDisplayName(row.userId, meta);
                  const canSelect = canSelectRow(row);
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          disabled={!canSelect}
                          onChange={() => toggle(row.id)}
                          aria-label={`Выбрать заявку ${appDisplayId(row)}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-text-primary">
                          {name}
                        </div>
                        <div className="text-xs text-text-muted">
                          Заявка #{appDisplayId(row)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {row.exam
                          ? subjectName(row.exam.subjectId)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {row.exam?.startsAt
                          ? formatShortDateTime(row.exam.startsAt)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {row.exam?.venue?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {formatShortDate(row.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                            dataStatusClass(meta?.verificationStatus ?? null),
                          )}
                        >
                          {dataStatusLabel(meta?.verificationStatus ?? null)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                            ctAppStatusClass(row.status),
                          )}
                        >
                          {ctAppStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right align-middle">
                        <button
                          type="button"
                          onClick={() => setReviewApp(row)}
                          className="rounded-[10px] border border-border bg-white px-3 py-1.5 text-sm font-bold text-brand-800 hover:bg-[#f4f7f9]"
                        >
                          Рассмотреть
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-xs text-text-muted">
              Показано {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, items.length)} из {items.length}
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-[8px] border border-border px-2.5 py-1.5 text-xs font-bold text-brand-800 disabled:opacity-40"
              >
                Пред
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1)
                .filter((n) => {
                  if (pageCount <= 7) return true;
                  return (
                    n === 1 ||
                    n === pageCount ||
                    Math.abs(n - page) <= 1
                  );
                })
                .map((n, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev != null && n - prev > 1;
                  return (
                    <span key={n} className="inline-flex items-center gap-1">
                      {showEllipsis ? (
                        <span className="px-1 text-xs text-text-muted">…</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setPage(n)}
                        className={cn(
                          "min-w-8 rounded-[8px] border px-2.5 py-1.5 text-xs font-bold",
                          page === n
                            ? "border-brand-700 bg-brand-700 text-white"
                            : "border-border text-brand-800 hover:bg-[#f4f7f9]",
                        )}
                      >
                        {n}
                      </button>
                    </span>
                  );
                })}
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className="rounded-[8px] border border-border px-2.5 py-1.5 text-xs font-bold text-brand-800 disabled:opacity-40"
              >
                След
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={reviewApp !== null}
        onClose={() => setReviewApp(null)}
        title="Рассмотрение заявки на ЦТ"
        subtitle={
          reviewApp ? `Заявка #${appDisplayId(reviewApp)}` : undefined
        }
        size="lg"
        footer={
          reviewApp?.status === "pending" ? (
            <>
              <FormButton
                type="button"
                variant="destructive"
                className="w-auto px-4 py-2.5"
                onClick={() => {
                  if (!reviewApp) return;
                  setRejectReasonKey(REJECT_REASONS[0].value);
                  setRejectComment("");
                  setRejectTarget(reviewApp);
                }}
                disabled={busy}
              >
                Отклонить
              </FormButton>
              <FormButton
                type="button"
                variant="secondary"
                className="w-auto px-4 py-2.5"
                onClick={() => setReviewApp(null)}
                disabled={busy}
              >
                Закрыть
              </FormButton>
              <FormButton
                type="button"
                className="w-auto px-4 py-2.5"
                onClick={() => {
                  if (!reviewApp) return;
                  void decide(reviewApp.id, "approved");
                }}
                disabled={busy || !reviewCanApprove}
                title={
                  reviewCanApprove
                    ? undefined
                    : "Одобрение доступно только при подтверждённых данных"
                }
              >
                Одобрить заявку
              </FormButton>
            </>
          ) : (
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto px-4 py-2.5"
              onClick={() => setReviewApp(null)}
            >
              Закрыть
            </FormButton>
          )
        }
      >
        {reviewApp ? (
          <div className="space-y-5">
            <div>
              <p className="text-lg font-extrabold text-brand-900">
                {applicantDisplayName(reviewApp.userId, reviewMeta)}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {[
                  reviewMeta?.passport
                    ? `Паспорт ${reviewMeta.passport}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" • ") || `ID ${reviewApp.userId.slice(0, 8)}…`}
              </p>
            </div>

            <div>
              <div
                className={cn(
                  "rounded-[10px] px-4 py-3 text-sm font-semibold",
                  reviewMeta?.verificationStatus === "approved"
                    ? "bg-[#E8F7EE] text-[#1B7A3E]"
                    : "bg-[#E8F1F8] text-[#2B6B8A]",
                )}
              >
                {reviewMeta?.verificationStatus === "approved"
                  ? "Данные подтверждены"
                  : reviewMeta?.verificationStatus
                    ? `Данные: ${moderatorStatusLabel(reviewMeta.verificationStatus).toLowerCase()}`
                    : "Персональные данные ещё не проверены"}
              </div>
              {reviewMeta?.verificationId ? (
                <Link
                  href={`/moderator/verifications/${reviewMeta.verificationId}`}
                  className="mt-2 inline-flex text-sm font-semibold text-brand-700 hover:underline"
                >
                  Открыть персональную проверку данных →
                </Link>
              ) : null}
            </div>

            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
                Выбранный экзамен
              </h3>
              <div className="rounded-[12px] border border-border bg-[#f8fafc] px-4 py-3">
                <p className="font-bold text-brand-900">
                  {reviewApp.exam
                    ? subjectName(reviewApp.exam.subjectId)
                    : "—"}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {reviewApp.exam?.startsAt
                    ? formatExamWhen(reviewApp.exam.startsAt).replace(
                        " г. в ",
                        ", ",
                      )
                    : "—"}
                </p>
                <p className="text-sm text-text-secondary">
                  {reviewApp.exam?.venue?.name || "—"}
                </p>
                {reviewApp.exam ? (
                  <p className="mt-2 text-sm font-semibold text-[#1B7A3E]">
                    Свободно мест: {reviewApp.exam.seatsLeft} из{" "}
                    {reviewApp.exam.capacity}
                  </p>
                ) : null}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
                Другие заявки абитуриента
              </h3>
              {otherApps.length === 0 ? (
                <p className="text-sm text-text-muted">Других заявок нет.</p>
              ) : (
                <ul className="space-y-2">
                  {otherApps.map((app) => (
                    <li
                      key={app.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-text-secondary">
                        {app.exam
                          ? subjectName(app.exam.subjectId)
                          : "Предмет"}{" "}
                        •{" "}
                        {app.exam?.startsAt
                          ? formatShortDateTime(app.exam.startsAt)
                          : "—"}{" "}
                        • {app.exam?.venue?.name || "—"}
                      </span>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                          ctAppStatusClass(app.status),
                        )}
                      >
                        {ctAppStatusLabel(app.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
                История статусов
              </h3>
              <div className="text-sm">
                <p className="font-semibold text-text-primary">
                  Подана абитуриентом → {ctAppStatusLabel(reviewApp.status)}
                </p>
                <p className="mt-1 text-text-muted">
                  {formatHistoryStamp(reviewApp.createdAt)}
                </p>
                {reviewApp.rejectReason ? (
                  <p className="mt-2 text-sm text-[#c94343]">
                    Причина: {reviewApp.rejectReason}
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title="Отклонить заявку на ЦТ?"
        subtitle="Абитуриент получит оповещение с причиной"
        size="sm"
        footer={
          <>
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto px-4 py-2.5"
              onClick={() => setRejectTarget(null)}
              disabled={busy}
            >
              Отмена
            </FormButton>
            <FormButton
              type="button"
              variant="destructive"
              className="w-auto px-4 py-2.5"
              disabled={busy}
              onClick={() => {
                if (!rejectTarget) return;
                void decide(rejectTarget.id, "rejected", rejectReasonText());
              }}
            >
              Отклонить заявку
            </FormButton>
          </>
        }
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-brand-900">
            Выберите причину отказа
          </span>
          <FilterSelect
            value={rejectReasonKey}
            onChange={(e) => setRejectReasonKey(e.target.value)}
          >
            {REJECT_REASONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FilterSelect>
        </label>
        <label className="mt-3 block space-y-1.5">
          <span className="text-sm font-semibold text-brand-900">
            Дополнительный комментарий
          </span>
          <textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            rows={3}
            className="w-full rounded-[10px] border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Дополнительный комментарий..."
          />
        </label>
      </Modal>

      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Массовое одобрение заявок"
        subtitle="Групповая выдача пропусков на ЦТ"
        size="sm"
        footer={
          <>
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto px-4 py-2.5"
              onClick={() => setBulkOpen(false)}
              disabled={busy}
            >
              Отмена
            </FormButton>
            <FormButton
              type="button"
              className="w-auto px-4 py-2.5"
              onClick={() => void approveBatch()}
              disabled={busy || selected.size === 0}
            >
              Подтвердить одобрение
            </FormButton>
          </>
        }
      >
        <p className="text-sm font-bold text-brand-900">
          Одобрить {selected.size} {selectedWord(selected.size)} на ЦТ?
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          Всем абитуриентам будут сформированы электронные пропуска.
        </p>
      </Modal>
    </div>
  );
}
