"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ModeratorDefaultQueueTab,
  NotificationPreferences,
} from "@/lib/notification";
import { FormButton } from "@/components/ui/FormButton";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { cn } from "@/lib/utils";

type NotifKey = keyof Pick<
  NotificationPreferences,
  | "allEnabled"
  | "verificationQueue"
  | "ctApplications"
  | "decisions"
>;

const KIND_TOGGLES: Array<{
  key: Exclude<NotifKey, "allEnabled">;
  title: string;
  description: string;
}> = [
  {
    key: "verificationQueue",
    title: "Очередь проверки данных",
    description:
      "Новые анкеты на верификацию персональных данных и повторные подачи.",
  },
  {
    key: "ctApplications",
    title: "Заявки на ЦТ",
    description: "Новые заявления на централизованное тестирование в очереди.",
  },
  {
    key: "decisions",
    title: "Решения и эскалации",
    description:
      "Напоминания о сроках, подтверждения своих решений и служебные события.",
  },
];

const QUEUE_TAB_OPTIONS: Array<{
  value: ModeratorDefaultQueueTab;
  label: string;
}> = [
  { value: "overview", label: "Обзор очереди" },
  { value: "docs", label: "Проверка данных" },
  { value: "applications", label: "Заявки на ЦТ" },
  { value: "history", label: "История решений" },
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

export function ModeratorSettings() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [draft, setDraft] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyNotif, setBusyNotif] = useState(false);
  const [busyProfile, setBusyProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/moderator/notification-preferences");
      const json = (await res.json().catch(() => ({}))) as NotificationPreferences & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "Не удалось загрузить настройки");
        return;
      }
      setPrefs(json);
      setDraft(json);
    } catch {
      setError("Сеть недоступна. Проверьте notification-service.");
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
      draft.verificationQueue !== prefs.verificationQueue ||
      draft.ctApplications !== prefs.ctApplications ||
      draft.decisions !== prefs.decisions);

  const profileDirty =
    !!draft && !!prefs && draft.defaultQueueTab !== prefs.defaultQueueTab;

  async function saveNotifications() {
    if (!draft) return;
    setBusyNotif(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/moderator/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allEnabled: draft.allEnabled,
          verificationQueue: draft.verificationQueue,
          ctApplications: draft.ctApplications,
          decisions: draft.decisions,
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
        "Настройки уведомлений сохранены. Доставка учитывает их при появлении событий для модератора.",
      );
    } finally {
      setBusyNotif(false);
    }
  }

  async function saveProfile() {
    if (!draft) return;
    setBusyProfile(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/moderator/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultQueueTab: draft.defaultQueueTab,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as NotificationPreferences & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "Не удалось сохранить рабочий профиль");
        return;
      }
      setPrefs(json);
      setDraft(json);
      setMessage("Рабочий профиль сохранён");
    } finally {
      setBusyProfile(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Настройки
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Личные предпочтения кабинета модератора: уведомления и рабочий
          профиль.
        </p>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-[10px] border border-brand-100 bg-brand-100/40 px-4 py-3 text-sm text-brand-900">
          {message}
        </p>
      ) : null}

      <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-text-muted">
              Уведомления модератора
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Персональные переключатели. Системные настройки админа на них не
              влияют.
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
                  Главный выключатель: при отключении события очереди для вас не
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

      <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-text-muted">
              Рабочий профиль
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Стартовый раздел кабинета после входа в роль модератора.
            </p>
          </div>
          <FormButton
            type="button"
            className="w-auto px-4 py-2.5"
            disabled={busyProfile || !profileDirty || loading || !draft}
            onClick={() => void saveProfile()}
          >
            Сохранить
          </FormButton>
        </div>

        {loading || !draft ? (
          <p className="mt-6 text-sm text-text-muted">Загрузка…</p>
        ) : (
          <div className="mt-6 space-y-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-text-primary">
                Раздел по умолчанию
              </span>
              <FilterSelect
                value={draft.defaultQueueTab}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          defaultQueueTab: e.target
                            .value as ModeratorDefaultQueueTab,
                        }
                      : prev,
                  )
                }
              >
                {QUEUE_TAB_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </FilterSelect>
              <span className="text-xs text-text-muted">
                Сохраняется в вашем профиле и готово для перехода при открытии
                кабинета.
              </span>
            </label>
          </div>
        )}
      </section>
    </div>
  );
}
