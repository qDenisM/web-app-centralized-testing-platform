"use client";

import { FormEvent, useEffect, useState } from "react";
import { FormButton } from "@/components/ui/FormButton";
import { Input } from "@/components/ui/Input";
import type { ApplicantProfile } from "@/lib/applicant";

export function ProfileForm() {
  const [birthDate, setBirthDate] = useState("");
  const [passportSeries, setPassportSeries] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

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
        setBirthDate(data.birthDate || "");
        setPassportSeries(data.passportSeries || "");
        setPassportNumber(data.passportNumber || "");
        setStatus(data.verification?.status || null);
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
      setStatus(data.verification?.status || null);
      setError(null);
      alert("Профиль сохранён");
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <p className="text-sm text-text-muted">Загрузка профиля…</p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Анкета абитуриента
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Паспортные данные для приёмной кампании.
          {status ? (
            <>
              {" "}
              Статус проверки:{" "}
              <span className="font-semibold text-brand-800">{status}</span>
            </>
          ) : null}
        </p>
      </div>

      <Input
        label="Дата рождения"
        name="birthDate"
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
        <Input
          label="Серия"
          name="passportSeries"
          value={passportSeries}
          onChange={(e) => setPassportSeries(e.target.value.toUpperCase())}
          placeholder="MP"
          maxLength={10}
        />
        <Input
          label="Номер паспорта"
          name="passportNumber"
          value={passportNumber}
          onChange={(e) => setPassportNumber(e.target.value)}
          placeholder="1234567"
          maxLength={20}
        />
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <FormButton disabled={loading} className="w-auto px-5 py-2.5">
        {loading ? "Сохраняем…" : "Сохранить"}
      </FormButton>
    </form>
  );
}
