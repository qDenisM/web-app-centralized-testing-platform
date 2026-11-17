"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CertificateForm } from "@/components/certificate/CertificateForm";
import { FormButton } from "@/components/ui/FormButton";
import {
  verificationStatusLabel,
  type ApplicantProfile,
} from "@/lib/applicant";

function hasPassport(profile: ApplicantProfile | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.birthDate &&
      profile.passportSeries?.trim() &&
      profile.passportNumber?.trim(),
  );
}

export function CertificateApplication() {
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [ready, setReady] = useState(false);

  const status = profile?.verification?.status || null;
  const canSubmit =
    status === "draft" || status === "rejected" || status === "returned";
  const canWithdraw =
    status === "pending" && !profile?.verification?.lockedBy;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/applicant/profile");
        const data = (await res.json().catch(() => ({}))) as ApplicantProfile & {
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Не удалось загрузить профиль");
          return;
        }
        setProfile(data);
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
  }, []);

  async function onSubmitForReview() {
    setError(null);
    setMessage(null);

    if (!hasPassport(profile)) {
      setError(
        "Сначала заполните паспортные данные в настройках профиля, затем отправьте заявку.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/applicant/profile/submit", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as ApplicantProfile & {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Не удалось отправить на проверку");
        return;
      }
      setProfile(data);
      setFormKey((k) => k + 1);
      setMessage("Заявка на проверку аттестата и анкеты отправлена");
    } catch {
      setError("Сеть недоступна");
    } finally {
      setSubmitting(false);
    }
  }

  async function onWithdraw() {
    setError(null);
    setMessage(null);
    setWithdrawing(true);
    try {
      const res = await fetch("/api/applicant/profile/withdraw", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as ApplicantProfile & {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Не удалось удалить заявку");
        return;
      }
      setProfile(data);
      // Remount form so fields unlock after status returns to draft.
      setFormKey((k) => k + 1);
      setMessage("Заявка удалена. Можно снова отредактировать и отправить.");
    } catch {
      setError("Сеть недоступна");
    } finally {
      setWithdrawing(false);
    }
  }

  if (!ready) {
    return <p className="text-sm text-text-muted">Загрузка…</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {status ? (
        <p className="text-sm text-text-secondary">
          Статус заявки:{" "}
          <span className="font-semibold text-brand-800">
            {verificationStatusLabel(status)}
          </span>
        </p>
      ) : null}

      {profile?.verification?.rejectReason ? (
        <p className="whitespace-pre-line rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Причина:{"\n"}
          {profile.verification.rejectReason}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}{" "}
          {!hasPassport(profile) ? (
            <Link
              href="/app/profile"
              className="font-bold text-brand-800 underline"
            >
              Открыть настройки
            </Link>
          ) : null}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-[10px] border border-brand-100 bg-brand-100/40 px-3 py-2 text-sm text-brand-900">
          {message}
        </p>
      ) : null}

      <CertificateForm
        key={formKey}
        onProfileChange={(next) => {
          setProfile(next);
          if (next.verification?.status === "pending") {
            setMessage(
              "Данные аттестата сохранены и заявка отправлена на проверку модератору.",
            );
            setError(null);
          }
        }}
      />

      <div className="flex flex-wrap gap-3 rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        {canSubmit ? (
          <FormButton
            type="button"
            className="w-auto px-5 py-2.5"
            disabled={submitting}
            onClick={() => void onSubmitForReview()}
          >
            {submitting ? "Отправляем…" : "Отправить на проверку"}
          </FormButton>
        ) : null}
        {canWithdraw ? (
          <FormButton
            type="button"
            variant="destructive"
            className="w-auto px-5 py-2.5"
            disabled={withdrawing}
            onClick={() => void onWithdraw()}
          >
            {withdrawing ? "Удаляем…" : "Удалить заявку"}
          </FormButton>
        ) : null}
        {status === "pending" && !profile?.verification?.lockedBy ? (
          <p className="w-full text-sm text-text-muted">
            Заявка на проверке. Пока модератор её не взял, можно удалить и
            отправить снова.
          </p>
        ) : null}
        {status === "pending" && profile?.verification?.lockedBy ? (
          <p className="w-full text-sm text-text-muted">
            Заявку уже рассматривает модератор — удаление недоступно.
          </p>
        ) : null}
        {canSubmit && !hasPassport(profile) ? (
          <p className="w-full text-sm text-text-muted">
            Для отправки нужны паспортные данные в{" "}
            <Link
              href="/app/profile"
              className="font-bold text-brand-700 hover:underline"
            >
              настройках профиля
            </Link>
            . Если они уже заполнены, подтверждение скана само отправит заявку.
          </p>
        ) : null}
        {!canSubmit && !canWithdraw && status === "approved" ? (
          <p className="w-full text-sm text-text-muted">
            Аттестат подтверждён модератором.
          </p>
        ) : null}
      </div>
    </div>
  );
}
