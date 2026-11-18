"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { FormButton } from "@/components/ui/FormButton";
import { Input } from "@/components/ui/Input";
import {
  verificationStatusLabel,
  type ApplicantProfile,
} from "@/lib/applicant";
import type { CatalogSubject } from "@/lib/catalog";
import { MAX_CT_RESULTS_FOR_SCORE } from "@/lib/competitive-score";
import type { CtResult } from "@/lib/results";
import type { ExamSession } from "@/lib/exam";
import { Alert } from "@/components/ui/Alert";

type MeUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
};

export function ProfileForm() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const [birthDate, setBirthDate] = useState("");
  const [passportSeries, setPassportSeries] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [ctResults, setCtResults] = useState<CtResult[]>([]);
  const [exams, setExams] = useState<ExamSession[]>([]);
  const [subjects, setSubjects] = useState<CatalogSubject[]>([]);
  const [selectedCtResultIds, setSelectedCtResultIds] = useState<string[]>([]);
  const [ctBusy, setCtBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const status = profile?.verification?.status || null;
  const locked = status === "pending" || status === "approved";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [meRes, profileRes, resultsRes, examsRes, subjectsRes] =
          await Promise.all([
            fetch("/api/users/me"),
            fetch("/api/applicant/profile"),
            fetch("/api/results/me"),
            fetch("/api/exam/exams"),
            fetch("/api/catalog/subjects"),
          ]);
        const meJson = (await meRes.json().catch(() => null)) as
          | (MeUser & { error?: string })
          | null;
        const profileJson = (await profileRes.json().catch(() => ({}))) as
          | ApplicantProfile
          | { error?: string };

        if (cancelled) return;

        if (meRes.ok && meJson?.id && meJson.fullName) {
          setMe({
            id: meJson.id,
            email: meJson.email,
            fullName: meJson.fullName,
            phone: meJson.phone ?? null,
          });
          setFullName(meJson.fullName || "");
          setPhone(meJson.phone || "");
        } else if (!meRes.ok) {
          setError(meJson?.error || "Не удалось загрузить аккаунт");
        }

        if (profileRes.ok && profileJson && !("error" in profileJson)) {
          const data = profileJson as ApplicantProfile;
          setProfile(data);
          setBirthDate(data.birthDate || "");
          setPassportSeries(data.passportSeries || "");
          setPassportNumber(data.passportNumber || "");
          setSelectedCtResultIds(data.selectedCtResultIds || []);
        } else if (!profileRes.ok) {
          setError(
            "error" in profileJson
              ? profileJson.error || "Не удалось загрузить профиль"
              : "Не удалось загрузить профиль",
          );
        }

        if (resultsRes.ok) {
          const rows = (await resultsRes.json().catch(() => [])) as CtResult[];
          if (Array.isArray(rows)) setCtResults(rows);
        }
        if (examsRes.ok) {
          const rows = (await examsRes.json().catch(() => [])) as ExamSession[];
          if (Array.isArray(rows)) setExams(rows);
        }
        if (subjectsRes.ok) {
          const rows = (await subjectsRes.json().catch(() => [])) as
            CatalogSubject[];
          if (Array.isArray(rows)) setSubjects(rows);
        }
      } catch {
        if (!cancelled) {
          setError("Сеть недоступна. Проверьте сервисы.");
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

  const publishedCt = useMemo(() => {
    const examById = new Map(exams.map((e) => [e.id, e] as const));
    return ctResults
      .filter((r) => r.status === "published" && typeof r.score === "number")
      .map((r) => {
        const exam = examById.get(r.examId);
        const subjectId = r.subjectId || exam?.subjectId || null;
        const subject =
          subjects.find((s) => s.id === subjectId)?.name || "Предмет";
        const year =
          r.campaignYear ??
          (exam?.startsAt ? new Date(exam.startsAt).getFullYear() : null);
        return { result: r, subject, year };
      })
      .sort((a, b) => (b.result.score ?? 0) - (a.result.score ?? 0));
  }, [ctResults, exams, subjects]);

  function toggleCtResult(id: string) {
    setSelectedCtResultIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_CT_RESULTS_FOR_SCORE) return prev;
      return [...prev, id];
    });
  }

  async function onSaveCtSelection(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (selectedCtResultIds.length > MAX_CT_RESULTS_FOR_SCORE) {
      setError(`Можно выбрать не более ${MAX_CT_RESULTS_FOR_SCORE} результатов ЦТ`);
      return;
    }
    setCtBusy(true);
    try {
      const res = await fetch("/api/applicant/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedCtResultIds }),
      });
      const data = (await res.json().catch(() => ({}))) as ApplicantProfile & {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Не удалось сохранить выбор результатов ЦТ");
        return;
      }
      setProfile(data);
      setSelectedCtResultIds(data.selectedCtResultIds || []);
      setMessage(
        selectedCtResultIds.length === 0
          ? "Выбор сброшен: в конкурсный балл войдут до 3 лучших опубликованных результатов"
          : "Выбор результатов ЦТ сохранён",
      );
    } catch {
      setError("Сеть недоступна");
    } finally {
      setCtBusy(false);
    }
  }

  async function onSaveAccount(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword || newPassword2) {
      if (newPassword !== newPassword2) {
        setError("Пароли не совпадают");
        return;
      }
      if (!currentPassword) {
        setError("Укажите текущий пароль");
        return;
      }
    }

    setAccountBusy(true);
    try {
      const body: Record<string, string> = {
        fullName: fullName.trim(),
        phone: phone.trim(),
      };
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as MeUser & {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Не удалось сохранить учётные данные");
        return;
      }
      setMe(data);
      setFullName(data.fullName || "");
      setPhone(data.phone || "");
      setCurrentPassword("");
      setNewPassword("");
      setNewPassword2("");
      setMessage("Учётные данные сохранены");
    } catch {
      setError("Сеть недоступна");
    } finally {
      setAccountBusy(false);
    }
  }

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
      setMessage("Данные анкеты сохранены");
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return <p className="text-sm text-text-muted">Загрузка профиля…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Профиль и настройки
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Учётные данные и анкета абитуриента.
          {status ? (
            <>
              {" "}
              Статус заявки на аттестат:{" "}
              <span className="font-semibold text-brand-800">
                {verificationStatusLabel(status)}
              </span>
              .{" "}
              <Link
                href="/app/certificate/history"
                className="font-bold text-brand-700 hover:underline"
              >
                История заявок
              </Link>
              {" · "}
              <Link
                href="/app/certificate"
                className="font-bold text-brand-700 hover:underline"
              >
                Отправить аттестат
              </Link>
            </>
          ) : (
            <>
              {" "}
              <Link
                href="/app/certificate"
                className="font-bold text-brand-700 hover:underline"
              >
                Отправить аттестат
              </Link>
            </>
          )}
        </p>
        {profile?.verification?.rejectReason ? (
          <p className="mt-2 whitespace-pre-line rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Причина:{"\n"}
            {profile.verification.rejectReason}{" "}
            <Link
              href={
                profile.verification.id
                  ? `/app/certificate/history/${profile.verification.id}`
                  : "/app/certificate/history"
              }
              className="font-bold underline"
            >
              Подробнее
            </Link>
          </p>
        ) : null}
      </div>

      {error ? (
        <Alert compact>{error}</Alert>
      ) : null}
      {message ? (
        <p className="rounded-[10px] border border-brand-100 bg-brand-100/40 px-3 py-2 text-sm text-brand-900">
          {message}
        </p>
      ) : null}

      <form
        onSubmit={onSaveAccount}
        className="space-y-4 rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]"
      >
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-text-muted">
          Учётные данные
        </h2>
        <Input
          label="ФИО"
          name="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <Input
          label="Email"
          name="email"
          value={me?.email || ""}
          disabled
        />
        <Input
          label="Телефон"
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+375..."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Текущий пароль"
            name="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            label="Новый пароль"
            name="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            label="Повтор пароля"
            name="newPassword2"
            type="password"
            value={newPassword2}
            onChange={(e) => setNewPassword2(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <FormButton disabled={accountBusy} className="w-auto px-5 py-2.5">
          {accountBusy ? "Сохраняем…" : "Сохранить учётные данные"}
        </FormButton>
      </form>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]"
      >
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-text-muted">
          Данные анкеты
        </h2>
        <p className="text-sm text-text-secondary">
          Паспортные данные нужны для отправки заявки на проверку аттестата.
        </p>
        <Input
          label="Дата рождения"
          name="birthDate"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          disabled={locked}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
          <Input
            label="Серия"
            name="passportSeries"
            value={passportSeries}
            onChange={(e) => setPassportSeries(e.target.value.toUpperCase())}
            placeholder="MP"
            maxLength={10}
            disabled={locked}
          />
          <Input
            label="Номер паспорта"
            name="passportNumber"
            value={passportNumber}
            onChange={(e) => setPassportNumber(e.target.value)}
            placeholder="1234567"
            maxLength={20}
            disabled={locked}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {!locked ? (
            <FormButton disabled={loading} className="w-auto px-5 py-2.5">
              {loading ? "Сохраняем…" : "Сохранить анкету"}
            </FormButton>
          ) : (
            <p className="text-sm text-text-muted">
              Пока заявка на проверке или подтверждена, анкету нельзя изменить.
              Управление отправкой — в разделе{" "}
              <Link
                href="/app/certificate"
                className="font-bold text-brand-700 hover:underline"
              >
                «Аттестат»
              </Link>
              , история — в{" "}
              <Link
                href="/app/certificate/history"
                className="font-bold text-brand-700 hover:underline"
              >
                «Заявки на аттестат»
              </Link>
              .
            </p>
          )}
        </div>
      </form>

      <form
        onSubmit={onSaveCtSelection}
        className="space-y-4 rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]"
      >
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-text-muted">
          Результаты ЦТ для конкурсного балла
        </h2>
        <p className="text-sm text-text-secondary">
          Отметьте до {MAX_CT_RESULTS_FOR_SCORE} опубликованных результатов,
          которые учитываются в конкурсном балле и шансах поступления. Если
          ничего не выбрано, автоматически берутся до{" "}
          {MAX_CT_RESULTS_FOR_SCORE} лучших по баллам.
        </p>
        {publishedCt.length === 0 ? (
          <p className="text-sm text-text-muted">
            Пока нет опубликованных результатов ЦТ.
          </p>
        ) : (
          <ul className="space-y-2">
            {publishedCt.map(({ result, subject, year }) => {
              const checked = selectedCtResultIds.includes(result.id);
              const disabled =
                !checked &&
                selectedCtResultIds.length >= MAX_CT_RESULTS_FOR_SCORE;
              return (
                <li key={result.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-[10px] border px-3 py-2.5 text-sm ${
                      checked
                        ? "border-brand-300 bg-brand-50"
                        : "border-border bg-[#fafbfc]"
                    } ${disabled ? "opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleCtResult(result.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-brand-900">
                        {subject}
                        {year ? ` · ${year}` : ""}
                      </span>
                      <span className="mt-0.5 block text-text-secondary">
                        Балл: {result.score}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <FormButton
            disabled={ctBusy || publishedCt.length === 0}
            className="w-auto px-5 py-2.5"
          >
            {ctBusy ? "Сохраняем…" : "Сохранить выбор ЦТ"}
          </FormButton>
          {selectedCtResultIds.length > 0 ? (
            <button
              type="button"
              className="text-sm font-semibold text-brand-700 hover:underline"
              onClick={() => setSelectedCtResultIds([])}
            >
              Сбросить (авто: лучшие {MAX_CT_RESULTS_FOR_SCORE})
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
