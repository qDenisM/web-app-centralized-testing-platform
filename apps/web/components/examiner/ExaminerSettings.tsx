"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { NotificationPreferences } from "@/lib/notification";
import { FormButton } from "@/components/ui/FormButton";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";

type MeUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
};

type ExaminerNotifKey = keyof Pick<
  NotificationPreferences,
  | "allEnabled"
  | "resultsPublish"
  | "resultsImport"
  | "examAssignments"
>;

const KIND_TOGGLES: Array<{
  key: Exclude<ExaminerNotifKey, "allEnabled">;
  title: string;
  description: string;
}> = [
  {
    key: "resultsPublish",
    title: "Публикация результатов",
    description:
      "Подтверждения и служебные события при публикации ведомости ЦТ.",
  },
  {
    key: "resultsImport",
    title: "Импорт результатов",
    description: "Завершение и ошибки импорта баллов из файла.",
  },
  {
    key: "examAssignments",
    title: "Допуски и назначения",
    description:
      "Новые допущенные абитуриенты и назначения по экзаменам комиссии.",
  },
];

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors",
        checked ? "bg-brand-700" : "bg-[#c5ced6]",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

export function ExaminerSettings() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [draft, setDraft] = useState<NotificationPreferences | null>(null);
  const [busyNotif, setBusyNotif] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, prefsRes] = await Promise.all([
        fetch("/api/users/me"),
        fetch("/api/examiner/notification-preferences"),
      ]);

      const meJson = (await meRes.json().catch(() => null)) as
        | (MeUser & { error?: string })
        | null;
      const prefsJson = (await prefsRes.json().catch(() => ({}))) as NotificationPreferences & {
        error?: string;
      };

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

      if (prefsRes.ok) {
        setPrefs(prefsJson);
        setDraft(prefsJson);
      } else {
        setError(prefsJson.error || "Не удалось загрузить уведомления");
      }
    } catch {
      setError("Сеть недоступна. Проверьте сервисы.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const notifDirty =
    !!draft &&
    !!prefs &&
    (draft.allEnabled !== prefs.allEnabled ||
      draft.resultsPublish !== prefs.resultsPublish ||
      draft.resultsImport !== prefs.resultsImport ||
      draft.examAssignments !== prefs.examAssignments);

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

  async function saveNotifications() {
    if (!draft) return;
    setBusyNotif(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/examiner/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allEnabled: draft.allEnabled,
          resultsPublish: draft.resultsPublish,
          resultsImport: draft.resultsImport,
          examAssignments: draft.examAssignments,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as NotificationPreferences & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "Не удалось сохранить уведомления");
        return;
      }
      setPrefs(json);
      setDraft(json);
      setMessage(
        "Настройки уведомлений сохранены. Доставка учитывает их при появлении событий для экзаменатора.",
      );
    } finally {
      setBusyNotif(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Настройки
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Учётные данные и уведомления кабинета экзаменатора.
        </p>
      </div>

      {error ? (
        <Alert>{error}</Alert>
      ) : null}
      {message ? (
        <p className="rounded-[10px] border border-brand-100 bg-brand-100/40 px-4 py-3 text-sm text-brand-900">
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
        {loading && !me ? (
          <p className="text-sm text-text-muted">Загрузка…</p>
        ) : (
          <>
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
          </>
        )}
      </form>

      <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-text-muted">
              Уведомления экзаменатора
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Персональные переключатели событий кабинета комиссии.
            </p>
          </div>
          <FormButton
            type="button"
            className="w-auto px-4 py-2.5"
            disabled={busyNotif || !notifDirty || loading || !draft}
            onClick={() => void saveNotifications()}
          >
            Сохранить
          </FormButton>
        </div>

        {loading || !draft ? (
          <p className="mt-6 text-sm text-text-muted">Загрузка…</p>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-[12px] border border-border bg-[#f8fafc] px-4 py-3">
              <div className="min-w-0">
                <p className="font-bold text-brand-900">Все уведомления</p>
                <p className="text-sm text-text-muted">
                  Главный выключатель: при отключении события для вас не
                  создаются.
                </p>
              </div>
              <Toggle
                label="Все уведомления"
                checked={draft.allEnabled}
                disabled={busyNotif}
                onChange={(v) =>
                  setDraft((prev) =>
                    prev ? { ...prev, allEnabled: v } : prev,
                  )
                }
              />
            </div>

            <div
              className={cn("space-y-3", !draft.allEnabled && "opacity-60")}
            >
              {KIND_TOGGLES.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 rounded-[12px] border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary">
                      {item.title}
                    </p>
                    <p className="text-sm text-text-muted">{item.description}</p>
                  </div>
                  <Toggle
                    label={item.title}
                    checked={draft[item.key]}
                    disabled={busyNotif || !draft.allEnabled}
                    onChange={(v) =>
                      setDraft((prev) =>
                        prev ? { ...prev, [item.key]: v } : prev,
                      )
                    }
                  />
                </div>
              ))}
            </div>

            {prefs?.updatedAt ? (
              <p className="text-xs text-text-muted">
                Обновлено: {new Date(prefs.updatedAt).toLocaleString("ru-RU")}
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
