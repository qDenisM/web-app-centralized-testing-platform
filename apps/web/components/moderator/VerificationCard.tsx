"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { FormButton } from "@/components/ui/FormButton";
import { Modal } from "@/components/ui/Modal";
import type { CatalogSubject } from "@/lib/catalog";
import type { ExamApplication } from "@/lib/exam";
import {
  applicantDisplayName,
  formatSubmittedAt,
  isAttestatImage,
  isAttestatPdf,
  moderatorStatusLabel,
  passportDisplay,
  versionLabelInline,
  type ModeratorQueueResponse,
  type ModeratorVerificationItem,
} from "@/lib/moderator";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";

function releaseVerificationLock(verificationId: string) {
  void fetch(`/api/applicant/moderator/verifications/${verificationId}/unlock`, {
    method: "POST",
    keepalive: true,
  }).catch(() => {
    /* best-effort unlock on leave */
  });
}

type VerificationCardProps = {
  id: string;
};

type DialogKind = "return" | "reject" | "status" | null;

type VerificationStatus = "pending" | "approved" | "returned" | "rejected";

const STATUS_OPTIONS: Array<{ value: VerificationStatus; label: string }> = [
  { value: "pending", label: "На проверке" },
  { value: "approved", label: "Подтверждено" },
  { value: "returned", label: "На исправление" },
  { value: "rejected", label: "Отказано" },
];

type FieldKey =
  | "fio"
  | "birthDate"
  | "passport"
  | "school"
  | "attestat";

type FieldMark = "match" | "error" | null;

type DocTab = "attestat";

const FIELD_DEFS: Array<{
  key: FieldKey;
  label: string;
  value: (item: ModeratorVerificationItem) => string;
}> = [
  {
    key: "fio",
    label: "ФИО (по паспорту)",
    value: (item) => item.profile.graduateName || "—",
  },
  {
    key: "birthDate",
    label: "Дата рождения",
    value: (item) => item.profile.birthDate || "—",
  },
  {
    key: "passport",
    label: "Серия и номер паспорта",
    value: (item) => passportDisplay(item) || "—",
  },
  {
    key: "school",
    label: "Учреждение образования",
    value: (item) => item.profile.schoolName || "—",
  },
  {
    key: "attestat",
    label: "Аттестат / средний балл",
    value: (item) => {
      const parts = [
        item.profile.attestatIssuedOn
          ? `выдан ${item.profile.attestatIssuedOn}`
          : null,
        item.profile.attestatAverage != null
          ? `Средний балл: ${item.profile.attestatAverage}`
          : null,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : "—";
    },
  },
];

export function VerificationCard({ id }: VerificationCardProps) {
  const router = useRouter();
  const [item, setItem] = useState<ModeratorVerificationItem | null>(null);
  const [history, setHistory] = useState<ModeratorVerificationItem[]>([]);
  const [ctApps, setCtApps] = useState<ExamApplication[]>([]);
  const [subjects, setSubjects] = useState<CatalogSubject[]>([]);
  const [nextId, setNextId] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [fieldNotes, setFieldNotes] = useState<Partial<Record<FieldKey, string>>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [statusTarget, setStatusTarget] =
    useState<VerificationStatus>("pending");
  const [statusReason, setStatusReason] = useState("");
  const [docTab, setDocTab] = useState<DocTab>("attestat");
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [marks, setMarks] = useState<Record<FieldKey, FieldMark>>({
    fio: null,
    birthDate: null,
    passport: null,
    school: null,
    attestat: null,
  });
  const skipUnlockRef = useRef(false);
  const holdLockRef = useRef(false);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Cancel deferred unlock from Strict Mode / quick remount.
    if (unlockTimerRef.current != null) {
      clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = null;
    }
    skipUnlockRef.current = false;
    holdLockRef.current = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [detailRes, queueRes, ctRes, subjectsRes, meRes] =
          await Promise.all([
            fetch(`/api/applicant/moderator/verifications/${id}`),
            fetch("/api/applicant/moderator/verifications?status=all"),
            fetch("/api/exam/moderator/applications?status=pending"),
            fetch("/api/catalog/subjects"),
            fetch("/api/users/me"),
          ]);

        const detail = (await detailRes.json().catch(() => ({}))) as
          ModeratorVerificationItem & { error?: string };
        const queue = (await queueRes.json().catch(() => ({}))) as
          ModeratorQueueResponse & { error?: string };
        const ctJson = (await ctRes.json().catch(() => ({}))) as {
          items?: ExamApplication[];
        };
        const subjectsJson = (await subjectsRes.json().catch(() => null)) as
          | CatalogSubject[]
          | null;
        const meJson = (await meRes.json().catch(() => null)) as {
          id?: string;
        } | null;

        if (!detailRes.ok) {
          if (!cancelled) {
            setError(detail.error || "Не удалось загрузить карточку");
            setItem(null);
          }
          return;
        }

        if (cancelled) return;

        const currentMeId = meRes.ok && meJson?.id ? meJson.id : null;
        setMeId(currentMeId);
        setItem(detail);
        holdLockRef.current =
          detail.status === "pending" &&
          (!detail.lockedBy ||
            !currentMeId ||
            detail.lockedBy === currentMeId);

        const queueItems = queueRes.ok ? queue.items || [] : [];
        const sameProfile = queueItems
          .filter((row) => row.profileId === detail.profileId)
          .sort(
            (a, b) =>
              new Date(b.submittedAt || 0).getTime() -
              new Date(a.submittedAt || 0).getTime(),
          );
        setHistory(sameProfile);

        const pendingFree = queueItems.filter(
          (row) =>
            row.status === "pending" &&
            !row.lockedBy &&
            row.id !== detail.id,
        );
        const after = pendingFree.find(
          (row) =>
            new Date(row.submittedAt || 0).getTime() >=
            new Date(detail.submittedAt || 0).getTime(),
        );
        setNextId((after || pendingFree[0] || null)?.id ?? null);

        if (ctRes.ok && Array.isArray(ctJson.items)) {
          setCtApps(
            ctJson.items.filter(
              (app) => app.userId === detail.profile.userId,
            ),
          );
        }
        if (subjectsRes.ok && Array.isArray(subjectsJson)) {
          setSubjects(subjectsJson);
        }

        setMarks({
          fio: null,
          birthDate: null,
          passport: null,
          school: null,
          attestat: null,
        });
        setZoom(100);
        setRotation(0);
        setDocTab("attestat");
      } catch {
        if (!cancelled) setError("Сеть недоступна");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (!skipUnlockRef.current && holdLockRef.current) {
        const lockId = id;
        unlockTimerRef.current = setTimeout(() => {
          unlockTimerRef.current = null;
          if (!skipUnlockRef.current) {
            releaseVerificationLock(lockId);
          }
        }, 500);
      }
    };
  }, [id]);

  useEffect(() => {
    function onPageHide() {
      if (unlockTimerRef.current != null) {
        clearTimeout(unlockTimerRef.current);
        unlockTimerRef.current = null;
      }
      if (!skipUnlockRef.current && holdLockRef.current) {
        releaseVerificationLock(id);
      }
    }
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [id]);

  const subjectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const subject of subjects) map.set(subject.id, subject.name);
    return map;
  }, [subjects]);

  const dependentSubjects = useMemo(() => {
    const names = ctApps
      .map((app) =>
        app.exam?.subjectId
          ? subjectNameById.get(app.exam.subjectId) || "предмет"
          : null,
      )
      .filter((name): name is string => Boolean(name));
    return [...new Set(names)];
  }, [ctApps, subjectNameById]);

  const allMarked = FIELD_DEFS.every((field) => marks[field.key] != null);
  const hasErrors = FIELD_DEFS.some((field) => marks[field.key] === "error");
  const erroredFields = useMemo(
    () => FIELD_DEFS.filter((field) => marks[field.key] === "error"),
    [marks],
  );

  function composeReturnReason() {
    const fieldLines = erroredFields.map((field) => {
      const note = fieldNotes[field.key]?.trim();
      return note
        ? `${field.label}: ${note}`
        : `${field.label}: требуется исправление`;
    });
    const general = reason.trim();
    const parts = [
      general || null,
      fieldLines.length > 0 ? fieldLines.join("\n") : null,
    ].filter(Boolean);
    return parts.join("\n\n");
  }

  async function refreshScan() {
    setZoom(100);
    setRotation(0);
    try {
      const res = await fetch(`/api/applicant/moderator/verifications/${id}`);
      const detail = (await res.json().catch(() => ({}))) as
        ModeratorVerificationItem & { error?: string };
      if (!res.ok) {
        setError(detail.error || "Не удалось обновить скан");
        return;
      }
      setItem(detail);
      setError(null);
    } catch {
      setError("Сеть недоступна");
    }
  }

  async function decide(
    decision: VerificationStatus,
    options?: { reason?: string; stay?: boolean },
  ) {
    setError(null);

    const composedReason =
      options?.reason !== undefined
        ? options.reason.trim()
        : decision === "returned"
          ? composeReturnReason()
          : reason.trim();

    if (
      (decision === "rejected" || decision === "returned") &&
      !composedReason
    ) {
      setError(
        decision === "returned"
          ? "Отметьте поля с ошибками или укажите комментарий"
          : "Укажите комментарий",
      );
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `/api/applicant/moderator/verifications/${id}/decide`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            reason: composedReason || undefined,
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as
        ModeratorVerificationItem & { error?: string };
      if (!res.ok) {
        setError(data.error || "Не удалось вынести решение");
        return;
      }
      // Keep lockedBy after decide (history); do not unlock on leave
      // unless the card was reopened to pending for continued review.
      skipUnlockRef.current = data.status !== "pending";
      holdLockRef.current = data.status === "pending";
      setItem(data);
      setDialog(null);
      setReason("");
      setStatusReason("");
      setFieldNotes({});
      if (options?.stay) {
        router.refresh();
        return;
      }
      router.push("/moderator/docs");
      router.refresh();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setSaving(false);
    }
  }

  function openStatusChange() {
    if (!item) return;
    const current = item.status as VerificationStatus;
    const fallback =
      STATUS_OPTIONS.find((o) => o.value !== current)?.value ?? "pending";
    setStatusTarget(fallback);
    setStatusReason("");
    setDialog("status");
  }

  async function releaseAndLeave() {
    skipUnlockRef.current = true;
    holdLockRef.current = false;
    try {
      await fetch(`/api/applicant/moderator/verifications/${id}/unlock`, {
        method: "POST",
      });
    } catch {
      /* ignore — queue will still allow reclaim if lock remains ours */
    }
    router.push("/moderator/docs");
    router.refresh();
  }

  if (loading) {
    return <p className="text-sm text-text-muted">Загрузка карточки…</p>;
  }

  if (!item) {
    return (
      <div className="space-y-3">
        <Link
          href="/moderator/docs"
          className="text-sm font-semibold text-brand-700 hover:underline"
        >
          ← К очереди
        </Link>
        <p className="text-sm text-red-700">{error || "Карточка не найдена"}</p>
      </div>
    );
  }

  const name = applicantDisplayName(item);
  const pending = item.status === "pending";
  const lockedByOther = Boolean(
    pending && meId && item.lockedBy && item.lockedBy !== meId,
  );
  const canDecide = pending && !lockedByOther;
  const canChangeStatus =
    !lockedByOther &&
    (item.status === "pending" ||
      item.status === "approved" ||
      item.status === "returned" ||
      item.status === "rejected");
  const metaLine = [
    item.applicant?.email || null,
    versionLabelInline(item.version),
    item.submittedAt ? formatSubmittedAt(item.submittedAt) : null,
    `user ${item.profile.userId.slice(0, 8)}…`,
  ]
    .filter(Boolean)
    .join(" • ");

  const decisionStatus = lockedByOther
    ? `Заявку сейчас проверяет другой модератор (${item.lockedBy?.slice(0, 8)}…)`
    : !pending
      ? `Решение вынесено${
          item.decidedAt
            ? `: ${new Date(item.decidedAt).toLocaleString("ru-RU")}`
            : ""
        } (${moderatorStatusLabel(item.status)})`
      : allMarked && !hasErrors
        ? "Готово к вынесению решения"
        : hasErrors
          ? "Есть поля с ошибками — отправьте на исправление или отклоните"
          : "Отметьте сверку полей со сканами";

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            {name}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{metaLine}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canDecide ? (
            <button
              type="button"
              onClick={() => void releaseAndLeave()}
              className="inline-flex rounded-[10px] border border-border bg-white px-3.5 py-2 text-sm font-bold text-text-secondary hover:bg-[#f8fafc]"
            >
              Освободить и к очереди
            </button>
          ) : (
            <Link
              href="/moderator/docs"
              className="inline-flex rounded-[10px] border border-border bg-white px-3.5 py-2 text-sm font-bold text-text-secondary hover:bg-[#f8fafc]"
            >
              ← К очереди
            </Link>
          )}
          {nextId && !lockedByOther ? (
            <Link
              href={`/moderator/verifications/${nextId}`}
              className="inline-flex rounded-[10px] border border-border bg-white px-3.5 py-2 text-sm font-bold text-text-secondary hover:bg-[#f8fafc]"
            >
              Следующий →
            </Link>
          ) : (
            <span className="inline-flex cursor-not-allowed rounded-[10px] border border-border bg-white px-3.5 py-2 text-sm font-bold text-text-muted opacity-60">
              Следующий →
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-brand-200 bg-brand-100/60 px-4 py-3">
        <p className="max-w-3xl text-sm text-brand-900">
          {ctApps.length > 0 ? (
            <>
              От подтверждения данных зависят {ctApps.length}{" "}
              {ctApps.length === 1 ? "заявка" : "заявки"} на ЦТ
              {dependentSubjects.length > 0
                ? `: ${dependentSubjects.join(", ")}`
                : ""}
              . Без подтверждения данных заявки не могут быть одобрены.
            </>
          ) : (
            <>
              Зависимых заявок на ЦТ в очереди нет. Подтверждение данных всё
              равно нужно для допуска к записи.
            </>
          )}
        </p>
        <Link
          href="/moderator/applications?status=pending"
          className="inline-flex shrink-0 rounded-[10px] border border-border bg-white px-3.5 py-2 text-sm font-bold text-brand-800 hover:bg-white/80"
        >
          Посмотреть заявки
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap gap-1 border-b border-border p-2">
            <button
              type="button"
              onClick={() => setDocTab("attestat")}
              className={cn(
                "rounded-[8px] px-3 py-1.5 text-sm font-semibold",
                docTab === "attestat"
                  ? "bg-brand-100 text-brand-900"
                  : "text-text-secondary hover:bg-[#f8fafc]",
              )}
            >
              Аттестат / Диплом
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-[#f8fafc] px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Масштаб: {zoom}%</span>
              <button
                type="button"
                className="rounded border border-border bg-white px-2 py-0.5 font-bold"
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
              >
                −
              </button>
              <button
                type="button"
                className="rounded border border-border bg-white px-2 py-0.5 font-bold"
                onClick={() => setZoom((z) => Math.min(200, z + 10))}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="rounded-[8px] border border-border bg-white px-2.5 py-1 text-sm font-semibold text-text-secondary"
              onClick={() => setRotation((r) => (r + 90) % 360)}
            >
              Повернуть ↺
            </button>
          </div>

          <div className="flex min-h-[360px] items-center justify-center overflow-auto bg-[#eef2f5] p-4">
            {!item.profile.hasAttestatScan ? (
              <p className="text-sm text-text-muted">Скан не загружен</p>
            ) : !item.attestatScanUrl ? (
              <div className="max-w-sm rounded-[8px] border border-border bg-white px-6 py-8 text-center shadow-sm">
                <p className="text-sm font-bold text-brand-900">
                  Скан аттестата загружен
                </p>
                <p className="mt-2 break-all text-[11px] text-text-muted">
                  {item.profile.storageKey}
                </p>
                <p className="mt-3 text-xs text-text-secondary">
                  Не удалось получить ссылку для просмотра. Нажмите
                  «Перезагрузить скан».
                </p>
              </div>
            ) : isAttestatPdf(item.profile.storageKey) ? (
              <div className="flex w-full max-w-3xl flex-col gap-3">
                <iframe
                  title="Скан аттестата (PDF)"
                  src={item.attestatScanUrl}
                  className="h-[480px] w-full rounded-[8px] border border-border bg-white shadow-sm"
                />
                <a
                  href={item.attestatScanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-center text-sm font-semibold text-brand-800 underline-offset-2 hover:underline"
                >
                  Открыть PDF в новой вкладке
                </a>
              </div>
            ) : isAttestatImage(item.profile.storageKey) ? (
              <div
                className="flex max-w-full items-center justify-center"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: "center",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.attestatScanUrl}
                  alt="Скан аттестата"
                  className="max-h-[520px] max-w-full rounded-[8px] border border-border bg-white object-contain shadow-sm"
                />
              </div>
            ) : (
              <div className="flex max-w-sm flex-col items-center gap-3 rounded-[8px] border border-border bg-white px-6 py-8 text-center shadow-sm">
                <p className="text-sm font-bold text-brand-900">
                  Файл аттестата загружен
                </p>
                <a
                  href={item.attestatScanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-brand-800 underline-offset-2 hover:underline"
                >
                  Открыть / скачать файл
                </a>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-sm">
            <p className="text-text-secondary">
              Документ об образовании
              {item.profile.schoolName
                ? ` • ${item.profile.schoolName}`
                : ""}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {item.attestatScanUrl ? (
                <a
                  href={item.attestatScanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[8px] border border-border bg-white px-3 py-1.5 text-sm font-semibold text-text-secondary hover:bg-[#f8fafc]"
                >
                  Открыть оригинал
                </a>
              ) : null}
              <button
                type="button"
                className="rounded-[8px] border border-border bg-white px-3 py-1.5 text-sm font-semibold text-text-secondary hover:bg-[#f8fafc]"
                onClick={() => {
                  void refreshScan();
                }}
              >
                Перезагрузить скан
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-text-muted">
              Сверка полей анкеты со сканами
            </h2>
            {canDecide ? (
              <button
                type="button"
                className="rounded-[8px] border border-border bg-white px-3 py-1.5 text-xs font-bold text-brand-800 hover:bg-[#f8fafc]"
                onClick={() =>
                  setMarks({
                    fio: "match",
                    birthDate: "match",
                    passport: "match",
                    school: "match",
                    attestat: "match",
                  })
                }
              >
                Отметить все: «Совпадает»
              </button>
            ) : null}
          </div>

          <ul className="space-y-3">
            {FIELD_DEFS.map((field) => {
              const mark = marks[field.key];
              return (
                <li
                  key={field.key}
                  className="rounded-[10px] border border-border px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                        {field.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-text-primary">
                        {field.value(item)}
                      </p>
                    </div>
                    {canDecide ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setMarks((prev) => ({
                              ...prev,
                              [field.key]: "match",
                            }))
                          }
                          className={cn(
                            "rounded-[8px] border px-2.5 py-1 text-xs font-bold",
                            mark === "match"
                              ? "border-green-300 bg-green-50 text-green-800"
                              : "border-border bg-white text-text-secondary",
                          )}
                        >
                          Совпадает
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setMarks((prev) => ({
                              ...prev,
                              [field.key]: "error",
                            }))
                          }
                          className={cn(
                            "rounded-[8px] border px-2.5 py-1 text-xs font-bold",
                            mark === "error"
                              ? "border-red-300 bg-red-50 text-red-700"
                              : "border-border bg-white text-text-secondary",
                          )}
                        >
                          Ошибка
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 border-t border-border pt-4">
            <h3 className="text-sm font-bold text-brand-900">
              История отправки и решений
            </h3>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">
                История пока пуста.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {history.map((row) => (
                  <li key={row.id} className="text-sm">
                    <p className="font-semibold text-text-primary">
                      {row.submittedAt
                        ? new Date(row.submittedAt).toLocaleString("ru-RU")
                        : "—"}{" "}
                      • {moderatorStatusLabel(row.status)}
                      {row.version > 1 ? ` (v${row.version})` : ""}
                    </p>
                    {row.rejectReason ? (
                      <p className="mt-0.5 whitespace-pre-line text-text-secondary">
                        {row.rejectReason}
                      </p>
                    ) : null}
                    {row.decidedAt ? (
                      <p className="text-xs text-text-muted">
                        Решение:{" "}
                        {new Date(row.decidedAt).toLocaleString("ru-RU")}
                        {row.lockedBy
                          ? ` • мод. ${row.lockedBy.slice(0, 8)}…`
                          : ""}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {error ? (
        <Alert compact>{error}</Alert>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <p className="text-sm text-text-secondary">
            Статус проверки:{" "}
            <span className="font-semibold text-brand-900">
              {decisionStatus}
            </span>
          </p>
          {canDecide ? (
            <div className="flex flex-wrap gap-2">
              <FormButton
                type="button"
                variant="secondary"
                className="w-auto border-red-200 px-4 py-2 text-red-700 hover:bg-red-50 hover:text-red-800"
                disabled={saving}
                onClick={() => {
                  setReason("");
                  setDialog("reject");
                }}
              >
                Отклонить
              </FormButton>
              <FormButton
                type="button"
                variant="secondary"
                className="w-auto px-4 py-2"
                disabled={saving}
                onClick={() => {
                  setReason("");
                  setFieldNotes({});
                  setDialog("return");
                }}
              >
                На исправление
              </FormButton>
              <FormButton
                type="button"
                className="w-auto px-4 py-2"
                disabled={saving || hasErrors}
                onClick={() => void decide("approved")}
              >
                {saving ? "Сохраняем…" : "Подтвердить данные"}
              </FormButton>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-text-secondary">
                {lockedByOther
                  ? "Занято другим модератором"
                  : moderatorStatusLabel(item.status)}
              </p>
              {canChangeStatus && !lockedByOther ? (
                <FormButton
                  type="button"
                  variant="secondary"
                  className="w-auto px-4 py-2"
                  disabled={saving}
                  onClick={openStatusChange}
                >
                  Изменить статус
                </FormButton>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={dialog === "return"}
        onClose={() => setDialog(null)}
        title="Отправить данные на исправление?"
        size="md"
        footer={
          <>
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto px-4 py-2.5"
              onClick={() => setDialog(null)}
              disabled={saving}
            >
              Отмена
            </FormButton>
            <FormButton
              type="button"
              className="w-auto px-4 py-2.5"
              onClick={() => void decide("returned")}
              disabled={
                saving || (erroredFields.length === 0 && !reason.trim())
              }
            >
              Отправить на исправление
            </FormButton>
          </>
        }
      >
        <div className="space-y-4">
          {erroredFields.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-text-secondary">
                Что исправить по полям
              </p>
              {erroredFields.map((field) => (
                <label key={field.key} className="block space-y-1.5">
                  <span className="text-sm font-semibold text-brand-900">
                    {field.label}
                  </span>
                  <input
                    type="text"
                    value={fieldNotes[field.key] || ""}
                    onChange={(e) =>
                      setFieldNotes((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="w-full rounded-[10px] border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    placeholder="Что не так / что ожидали (необязательно)"
                  />
                </label>
              ))}
            </div>
          ) : (
            <p className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Нет отмеченных ошибок. Отметьте поля кнопкой «Ошибка» на карточке
              сверки или укажите общий комментарий ниже.
            </p>
          )}

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-text-secondary">
              Общий комментарий (необязательно)
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-[10px] border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="Дополнительное пояснение для абитуриента"
            />
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        onConfirm={() => void decide("rejected")}
        title="Отклонить анкету абитуриента?"
        confirmLabel="Отклонить"
        variant="destructive"
        busy={saving}
      >
        <label className="mt-3 block space-y-1.5">
          <span className="text-sm font-semibold text-text-secondary">
            Комментарий *
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="w-full rounded-[10px] border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Причина отклонения"
          />
        </label>
        <p className="mt-3 text-xs text-text-muted">
          Абитуриент не сможет продолжить кампанию без повторной подачи
          документов.
        </p>
      </ConfirmDialog>

      <Modal
        open={dialog === "status"}
        onClose={() => setDialog(null)}
        title="Изменить статус проверки"
        subtitle="Абитуриент получит уведомление о новом решении"
        size="sm"
        footer={
          <>
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto px-4 py-2.5"
              onClick={() => setDialog(null)}
              disabled={saving}
            >
              Отмена
            </FormButton>
            <FormButton
              type="button"
              className="w-auto px-4 py-2.5"
              disabled={
                saving ||
                !item ||
                statusTarget === item.status ||
                ((statusTarget === "rejected" ||
                  statusTarget === "returned") &&
                  !statusReason.trim())
              }
              onClick={() =>
                void decide(statusTarget, {
                  reason: statusReason,
                  stay: true,
                })
              }
            >
              Сохранить статус
            </FormButton>
          </>
        }
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-brand-900">
            Новый статус
          </span>
          <FilterSelect
            value={statusTarget}
            onChange={(e) =>
              setStatusTarget(e.target.value as VerificationStatus)
            }
          >
            {STATUS_OPTIONS.filter((opt) => opt.value !== item.status).map(
              (opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ),
            )}
          </FilterSelect>
        </label>
        {statusTarget === "rejected" || statusTarget === "returned" ? (
          <label className="mt-3 block space-y-1.5">
            <span className="text-sm font-semibold text-brand-900">
              Причина *
            </span>
            <textarea
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              rows={3}
              className="w-full rounded-[10px] border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder={
                statusTarget === "returned"
                  ? "Что нужно исправить"
                  : "Причина отклонения"
              }
            />
          </label>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">
            {statusTarget === "pending"
              ? "Заявка вернётся в очередь на повторную проверку."
              : "Данные снова будут считаться подтверждёнными."}
          </p>
        )}
      </Modal>
    </div>
  );
}
