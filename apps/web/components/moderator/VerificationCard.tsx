"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormButton } from "@/components/ui/FormButton";
import { Modal } from "@/components/ui/Modal";
import {
  moderatorStatusLabel,
  type ModeratorVerificationItem,
} from "@/lib/moderator";

type VerificationCardProps = {
  id: string;
};

type DialogKind = "return" | "reject" | null;

export function VerificationCard({ id }: VerificationCardProps) {
  const router = useRouter();
  const [item, setItem] = useState<ModeratorVerificationItem | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/applicant/moderator/verifications/${id}`,
        );
        const data = (await res.json().catch(() => ({}))) as ModeratorVerificationItem & {
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) setError(data.error || "Не удалось загрузить карточку");
          return;
        }
        if (!cancelled) setItem(data);
      } catch {
        if (!cancelled) setError("Сеть недоступна");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function decide(decision: "approved" | "returned" | "rejected") {
    setError(null);

    if (
      (decision === "returned" || decision === "rejected") &&
      !reason.trim()
    ) {
      setError("Укажите комментарий");
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
            reason: reason.trim() || undefined,
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as ModeratorVerificationItem & {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Не удалось вынести решение");
        return;
      }
      setItem(data);
      setDialog(null);
      setReason("");
      router.push("/moderator/docs");
      router.refresh();
    } catch {
      setError("Сеть недоступна");
    } finally {
      setSaving(false);
    }
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

  const name =
    item.profile.graduateName ||
    `Абитуриент ${item.profile.userId.slice(0, 8)}`;
  const pending = item.status === "pending";

  return (
    <div className="space-y-5">
      <Link
        href="/moderator/docs"
        className="text-sm font-semibold text-brand-700 hover:underline"
      >
        ← К списку документов
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Проверка анкеты: {name}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Версия v{item.version}. Статус:{" "}
            <span className="font-semibold text-brand-800">
              {moderatorStatusLabel(item.status)}
            </span>
          </p>
          {item.submittedAt ? (
            <p className="text-xs text-text-muted">
              Отправлено: {new Date(item.submittedAt).toLocaleString("ru-RU")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-text-muted">
            Область сканирования
          </h2>
          {item.profile.hasAttestatScan ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[10px] border-2 border-dashed border-brand-200 bg-[#f4f7f9] px-4 py-8 text-center">
              <p className="text-sm font-semibold text-brand-900">
                Скан аттестата
              </p>
              <p className="mt-2 text-xs text-text-muted">
                Просмотр в встроенной панели (заглушка)
              </p>
              <p className="mt-3 break-all text-[10px] text-text-muted">
                {item.profile.storageKey}
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-muted">Скан не загружен</p>
          )}
        </section>

        <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-text-muted">
            Сверка полей
          </h2>
          <dl className="space-y-3 text-sm">
            <Field label="ФИО" value={item.profile.graduateName} />
            <Field label="Дата рождения" value={item.profile.birthDate} />
            <Field
              label="Паспорт"
              value={
                item.profile.passportSeries && item.profile.passportNumber
                  ? `${item.profile.passportSeries} ${item.profile.passportNumber}`
                  : null
              }
            />
            <Field label="Учебное заведение" value={item.profile.schoolName} />
            <Field
              label="Средний балл"
              value={
                item.profile.attestatAverage != null
                  ? String(item.profile.attestatAverage)
                  : null
              }
            />
            <Field
              label="Дата выдачи аттестата"
              value={item.profile.attestatIssuedOn}
            />
          </dl>
        </section>
      </div>

      {item.rejectReason ? (
        <div className="rounded-[10px] border border-[#C6900A]/30 bg-[#FFF4D6] px-3 py-2 text-sm text-[#9A6B00]">
          Комментарий: {item.rejectReason}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {pending ? (
        <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap gap-3">
            <FormButton
              type="button"
              variant="destructive"
              className="w-auto px-4 py-2"
              disabled={saving}
              onClick={() => {
                setReason("");
                setDialog("reject");
              }}
            >
              Полное отклонение
            </FormButton>
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto px-4 py-2"
              disabled={saving}
              onClick={() => {
                setReason("");
                setDialog("return");
              }}
            >
              На исправление
            </FormButton>
            <FormButton
              type="button"
              className="w-auto px-4 py-2"
              disabled={saving}
              onClick={() => void decide("approved")}
            >
              {saving ? "Сохраняем…" : "Подтвердить данные"}
            </FormButton>
          </div>
        </section>
      ) : (
        <p className="text-sm text-text-secondary">
          Решение уже вынесено
          {item.decidedAt
            ? `: ${new Date(item.decidedAt).toLocaleString("ru-RU")}`
            : "."}
        </p>
      )}

      <Modal
        open={dialog === "return"}
        onClose={() => setDialog(null)}
        title="Отправить данные на исправление?"
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
              onClick={() => void decide("returned")}
              disabled={saving || !reason.trim()}
            >
              Отправить на исправление
            </FormButton>
          </>
        }
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-text-secondary">
            Комментарий для абитуриента *
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="w-full rounded-[10px] border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Укажите, что нужно исправить"
          />
        </label>
      </Modal>

      <ConfirmDialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        onConfirm={() => void decide("rejected")}
        title="Полное отклонение анкеты абитуриента"
        confirmLabel="Отклонить анкету"
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
            placeholder="Причина полного отклонения"
          />
        </label>
        <p className="mt-3 text-xs text-text-muted">
          Абитуриент не сможет продолжить кампанию без повторной подачи
          документов.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-semibold text-text-primary">{value || "—"}</dd>
    </div>
  );
}