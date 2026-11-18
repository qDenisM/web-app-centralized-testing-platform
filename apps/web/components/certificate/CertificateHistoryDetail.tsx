"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatVerificationDate,
  verificationStatusBadgeClass,
  verificationStatusLabel,
  verificationVersionLabel,
  type VerificationDetail,
} from "@/lib/applicant";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/StatusBadge";

type CertificateHistoryDetailProps = {
  id: string;
};

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-text-primary">
        {value === null || value === undefined || value === "" ? "—" : value}
      </dd>
    </div>
  );
}

export function CertificateHistoryDetail({ id }: CertificateHistoryDetailProps) {
  const [item, setItem] = useState<VerificationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/applicant/verifications/${id}`);
        const data = (await res.json().catch(() => ({}))) as VerificationDetail & {
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Не удалось загрузить заявку");
          return;
        }
        setItem(data);
      } catch {
        if (!cancelled) setError("Сеть недоступна");
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!ready) {
    return <p className="text-sm text-text-muted">Загрузка…</p>;
  }

  if (error || !item) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href="/app/certificate/history"
          className="text-sm font-bold text-brand-700 hover:underline"
        >
          ← К списку заявок
        </Link>
        <Alert compact>{error || "Заявка не найдена"}</Alert>
      </div>
    );
  }

  const showReason =
    Boolean(item.rejectReason) &&
    (item.status === "rejected" || item.status === "returned");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href="/app/certificate/history"
          className="text-sm font-bold text-brand-700 hover:underline"
        >
          ← К списку заявок
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            {verificationVersionLabel(item.version)}
          </h1>
          <StatusBadge className={verificationStatusBadgeClass(item.status)}>
            {verificationStatusLabel(item.status)}
          </StatusBadge>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Просмотр заявки без возможности изменить или отправить. Для новой
          отправки используйте{" "}
          <Link
            href="/app/certificate"
            className="font-bold text-brand-700 hover:underline"
          >
            Аттестат
          </Link>
          .
        </p>
      </div>

      {showReason ? (
        <div
          className={cn(
            "whitespace-pre-line rounded-[10px] border px-3 py-2 text-sm",
            item.status === "rejected"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-[#E8C96A]/50 bg-[#FFF4D6] text-[#9A6B00]",
          )}
        >
          <span className="font-bold">
            {item.status === "returned"
              ? "Что нужно исправить:"
              : "Причина отказа:"}
          </span>
          {"\n"}
          {item.rejectReason}
        </div>
      ) : null}

      <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-text-muted">
          Статус и даты
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Статус" value={verificationStatusLabel(item.status)} />
          <Field label="Версия" value={item.version} />
          <Field
            label="Отправлено"
            value={formatVerificationDate(item.submittedAt)}
          />
          <Field
            label="Решение"
            value={formatVerificationDate(item.decidedAt)}
          />
        </dl>
      </section>

      <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-text-muted">
          Данные анкеты
        </h2>
        <p className="mt-1 text-xs text-text-muted">
          Показаны текущие поля профиля (отдельный снимок на момент отправки не
          хранится).
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Дата рождения" value={item.profile.birthDate} />
          <Field
            label="Паспорт"
            value={
              item.profile.passportSeries || item.profile.passportNumber
                ? `${item.profile.passportSeries || "—"} ${item.profile.passportNumber || ""}`.trim()
                : null
            }
          />
          <Field label="ФИО выпускника" value={item.profile.graduateName} />
          <Field label="Учреждение образования" value={item.profile.schoolName} />
          <Field
            label="Средний балл"
            value={
              item.profile.attestatAverage != null
                ? item.profile.attestatAverage.toFixed(1)
                : null
            }
          />
          <Field
            label="Дата выдачи аттестата"
            value={item.profile.attestatIssuedOn}
          />
          <Field
            label="Скан аттестата"
            value={item.profile.hasAttestatScan ? "Загружен" : "Нет"}
          />
        </dl>
      </section>
    </div>
  );
}
