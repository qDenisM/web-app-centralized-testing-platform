"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applicationStatusLabel,
  formatExamWhen,
  type ExamApplication,
} from "@/lib/exam";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Drawer } from "@/components/ui/Drawer";
import { FormButton } from "@/components/ui/FormButton";
import { Modal } from "@/components/ui/Modal";

type Tab = "pending" | "approved" | "rejected" | "all";

type QueueResponse = {
  items: ExamApplication[];
  counts: {
    all: number;
    pending: number;
    approved: number;
    rejected: number;
  };
};

const REJECT_REASONS = [
  { value: "docs", label: "Неполный пакет документов" },
  { value: "passport", label: "Паспортные данные не подтверждены" },
  { value: "duplicate", label: "Дублирующая запись на сеанс" },
  { value: "other", label: "Другое" },
];

export function ModeratorCtApplications() {
  const [tab, setTab] = useState<Tab>("pending");
  const [data, setData] = useState<QueueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [reviewApp, setReviewApp] = useState<ExamApplication | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ExamApplication | null>(null);
  const [rejectReasonKey, setRejectReasonKey] = useState(REJECT_REASONS[0].value);
  const [rejectComment, setRejectComment] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/exam/moderator/applications?status=${tab}`,
      );
      const json = (await res.json().catch(() => ({}))) as QueueResponse & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "Не удалось загрузить заявки");
        return;
      }
      setData(json);
      setSelected(new Set());
    } catch {
      setError("Сеть недоступна. Проверьте exam-service.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = data?.items || [];
  const counts = data?.counts;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  async function decide(id: string, decision: "approved" | "rejected", reason?: string) {
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
    { id: "pending", label: "Ожидают", count: counts?.pending },
    { id: "approved", label: "Одобрены", count: counts?.approved },
    { id: "rejected", label: "Отклонены", count: counts?.rejected },
    { id: "all", label: "Все", count: counts?.all },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Заявки абитуриентов на сдачу ЦТ
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Подтверждение записи на сессии централизованного тестирования.
          </p>
        </div>
        {tab === "pending" && selected.size > 0 ? (
          <FormButton
            type="button"
            className="w-auto"
            onClick={() => setBulkOpen(true)}
            disabled={busy}
          >
            Массовое одобрение ({selected.size})
          </FormButton>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-[10px] px-3.5 py-2 text-sm font-semibold",
              tab === item.id
                ? "bg-brand-100 text-brand-900"
                : "bg-white text-text-secondary border border-border",
            )}
          >
            {item.label}
            {typeof item.count === "number" ? ` · ${item.count}` : ""}
          </button>
        ))}
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
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-[#f8fafc] text-xs uppercase tracking-wide text-text-muted">
              <tr>
                {tab === "pending" ? <th className="w-10 px-4 py-3" /> : null}
                <th className="px-4 py-3">Абитуриент</th>
                <th className="px-4 py-3">Сессия</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  {tab === "pending" ? (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                        aria-label="Выбрать заявку"
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {row.userId.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {row.exam?.startsAt
                      ? formatExamWhen(row.exam.startsAt)
                      : row.examId.slice(0, 8)}
                    {row.exam?.venue?.name ? ` · ${row.exam.venue.name}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    {applicationStatusLabel(row.status)}
                    {row.passNumber ? ` · ${row.passNumber}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewApp(row)}
                        className="rounded-[8px] border border-border px-3 py-1.5 text-xs font-bold text-brand-800 hover:bg-brand-50"
                      >
                        Рассмотреть
                      </button>
                      {row.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void decide(row.id, "approved")}
                            className="rounded-[8px] bg-brand-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-800 disabled:opacity-60"
                          >
                            Одобрить
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setRejectReasonKey(REJECT_REASONS[0].value);
                              setRejectComment("");
                              setRejectTarget(row);
                            }}
                            className="rounded-[8px] border border-border px-3 py-1.5 text-xs font-bold text-[#c94343] hover:bg-[#fdecec] disabled:opacity-60"
                          >
                            Отклонить
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={reviewApp !== null}
        onClose={() => setReviewApp(null)}
        title="Рассмотрение заявки на ЦТ"
        widthClassName="max-w-lg"
        footer={
          reviewApp?.status === "pending" ? (
            <>
              <FormButton
                type="button"
                variant="secondary"
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
                className="w-auto px-4 py-2.5"
                onClick={() => {
                  if (!reviewApp) return;
                  void decide(reviewApp.id, "approved");
                }}
                disabled={busy}
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
          <dl className="space-y-3 text-sm">
            <DrawerField label="ID заявки" value={reviewApp.id} />
            <DrawerField label="Абитуриент" value={reviewApp.userId} />
            <DrawerField
              label="Сеанс"
              value={
                reviewApp.exam?.startsAt
                  ? formatExamWhen(reviewApp.exam.startsAt)
                  : reviewApp.examId
              }
            />
            <DrawerField
              label="Пункт"
              value={reviewApp.exam?.venue?.name || "—"}
            />
            <DrawerField
              label="Статус"
              value={applicationStatusLabel(reviewApp.status)}
            />
            {reviewApp.rejectReason ? (
              <DrawerField label="Причина" value={reviewApp.rejectReason} />
            ) : null}
          </dl>
        ) : null}
      </Drawer>

      <Modal
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title="Отклонить заявку на ЦТ?"
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
          <span className="text-sm font-semibold text-text-secondary">
            Причина
          </span>
          <select
            value={rejectReasonKey}
            onChange={(e) => setRejectReasonKey(e.target.value)}
            className="w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm"
          >
            {REJECT_REASONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block space-y-1.5">
          <span className="text-sm font-semibold text-text-secondary">
            Комментарий
          </span>
          <textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            rows={3}
            className="w-full rounded-[10px] border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Дополнительные детали для абитуриента"
          />
        </label>
      </Modal>

      <ConfirmDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onConfirm={() => void approveBatch()}
        title="Массовое одобрение заявок"
        confirmLabel={`Одобрить (${selected.size})`}
        busy={busy}
      >
        Будут одобрены выбранные заявки ({selected.size}). Абитуриентам будут
        сформированы пропуска на сдачу ЦТ.
      </ConfirmDialog>
    </div>
  );
}

function DrawerField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border pb-2">
      <dt className="text-xs font-bold uppercase tracking-wide text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-text-primary">{value}</dd>
    </div>
  );
}