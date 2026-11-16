"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { FormButton } from "@/components/ui/FormButton";
import { Input } from "@/components/ui/Input";
import {
  verificationStatusLabel,
  type ApplicantProfile,
} from "@/lib/applicant";

export function ProfileForm() {
  const [birthDate, setBirthDate] = useState("");
  const [passportSeries, setPassportSeries] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  const status = profile?.verification?.status || null;
  const canSubmit =
    status === "draft" || status === "rejected" || status === "returned";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/applicant/profile");
        const data = (await res.json().catch(() => ({}))) as ApplicantProfile & {
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) setError(data.error || "Не удалось загрузить профиль");
          return;
        }
        if (cancelled) return;
        setProfile(data);
        setBirthDate(data.birthDate || "");
        setPassportSeries(data.passportSeries || "");
        setPassportNumber(data.passportNumber || "");
      } catch {
        if (!cancelled) {
          setError("Сеть недоступна. Проверьте applicant-service.");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/applicant/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthDate: birthDate || null,
          passportSeries: passportSeries || null,
          passportNumber: passportNumber || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as ApplicantProfile & {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Не удалось сохранить");
        return;
      }
      setProfile(data);
      setMessage("Профиль сохранён");
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitForReview() {
    setError(null);
    setMessage(null);
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
      setMessage("Анкета отправлена на проверку");
    } catch {
      setError("Сеть недоступна");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return <p className="text-sm text-text-muted">Загрузка профиля…</p>;
  }

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Анкета абитуриента
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Паспортные данные для приёмной кампании. Статус:{" "}
          <span className="font-semibold text-brand-800">
            {verificationStatusLabel(status)}
          </span>
        </p>
        {profile?.verification?.rejectReason ? (
          <p className="mt-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Причина: {profile.verification.rejectReason}
          </p>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <Input
          label="Дата рождения"
          name="birthDate"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          disabled={status === "pending" || status === "approved"}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
          <Input
            label="Серия"
            name="passportSeries"
            value={passportSeries}
            onChange={(e) => setPassportSeries(e.target.value.toUpperCase())}
            placeholder="MP"
            maxLength={10}
            disabled={status === "pending" || status === "approved"}
          />
          <Input
            label="Номер паспорта"
            name="passportNumber"
            value={passportNumber}
            onChange={(e) => setPassportNumber(e.target.value)}
            placeholder="1234567"
            maxLength={20}
            disabled={status === "pending" || status === "approved"}
          />
        </div>

        <div className="rounded-[10px] border border-border bg-[#f4f7f9] px-3 py-2.5 text-sm text-text-secondary">
          Аттестат:{" "}
          {profile?.hasAttestatScan ? (
            <span className="font-semibold text-brand-800">
              скан загружен
              {profile.attestatAverage != null
                ? `, средний балл ${profile.attestatAverage}`
                : ""}
            </span>
          ) : (
            <span>
              ещё не загружен —{" "}
              <Link
                href="/app/certificate"
                className="font-bold text-brand-700 hover:underline"
              >
                перейти к аттестату
              </Link>
            </span>
          )}
        </div>

        {error ? (
          <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="rounded-[10px] border border-brand-100 bg-brand-100/40 px-3 py-2 text-sm text-brand-900">
            {message}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {status !== "pending" && status !== "approved" ? (
            <FormButton disabled={loading} className="w-auto px-5 py-2.5">
              {loading ? "Сохраняем…" : "Сохранить"}
            </FormButton>
          ) : null}

          {canSubmit ? (
            <FormButton
              type="button"
              className="w-auto px-5 py-2.5"
              disabled={submitting}
              onClick={onSubmitForReview}
            >
              {submitting ? "Отправляем…" : "Отправить на проверку"}
            </FormButton>
          ) : null}
        </div>
      </form>
    </div>
  );
}
