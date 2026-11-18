"use client";

import { useCallback, useEffect, useState } from "react";
import type { NotificationSettings } from "@/lib/notification";
import {
  dataModeLabel,
  type SystemSettings,
} from "@/lib/system-settings";
import { FormButton } from "@/components/ui/FormButton";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";

type NotifKey = keyof Pick<
  NotificationSettings,
  | "allEnabled"
  | "verificationEnabled"
  | "applicationEnabled"
  | "resultEnabled"
>;

const KIND_TOGGLES: Array<{
  key: Exclude<NotifKey, "allEnabled">;
  title: string;
  description: string;
}> = [
  {
    key: "verificationEnabled",
    title: "Решение по анкете",
    description:
      "Подтверждение, возврат или отказ модератора по персональным данным.",
  },
  {
    key: "applicationEnabled",
    title: "Допуск на ЦТ",
    description: "Одобрение записи на экзамен и номер пропуска.",
  },
  {
    key: "resultEnabled",
    title: "Результаты ЦТ",
    description: "Публикация балла после проверки экзаменатором.",
  },
];

const SYSTEM_TOGGLES: Array<{
  key: keyof Pick<
    SystemSettings,
    "registrationOpen" | "ctApplicationsOpen" | "ocrEnabled" | "maintenanceMode"
  >;
  title: string;
  description: string;
}> = [
  {
    key: "registrationOpen",
    title: "Регистрация абитуриентов",
    description: "Разрешить создание новых аккаунтов на /register.",
  },
  {
    key: "ctApplicationsOpen",
    title: "Запись на ЦТ",
    description: "Абитуриенты могут подавать заявления на экзамены.",
  },
  {
    key: "ocrEnabled",
    title: "OCR аттестата",
    description: "Распознавание скана аттестата через AI-сервис.",
  },
  {
    key: "maintenanceMode",
    title: "Режим обслуживания",
    description:
      "Баннер у абитуриентов и админа; блокирует регистрацию, запись на ЦТ и OCR.",
  }
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

export function AdminSettings() {
  const [notif, setNotif] = useState<NotificationSettings | null>(null);
  const [notifDraft, setNotifDraft] = useState<NotificationSettings | null>(null);
  const [system, setSystem] = useState<SystemSettings | null>(null);
  const [systemDraft, setSystemDraft] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyNotif, setBusyNotif] = useState(false);
  const [busySystem, setBusySystem] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [notifRes, systemRes] = await Promise.all([
        fetch("/api/admin/notification-settings"),
        fetch("/api/admin/system-settings"),
      ]);
      const notifJson = (await notifRes.json().catch(() => ({}))) as NotificationSettings & {
        error?: string;
      };
      const systemJson = (await systemRes.json().catch(() => ({}))) as SystemSettings & {
        error?: string;
      };
      if (!notifRes.ok) {
        setError(notifJson.error || "Не удалось загрузить настройки уведомлений");
        return;
      }
      if (!systemRes.ok) {
        setError(systemJson.error || "Не удалось загрузить системные настройки");
        return;
      }
      setNotif(notifJson);
      setNotifDraft(notifJson);
      setSystem(systemJson);
      setSystemDraft(systemJson);
    } catch {
      setError("Сеть недоступна. Проверьте catalog- и notification-service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const notifDirty =
    !!notifDraft &&
    !!notif &&
    (notifDraft.allEnabled !== notif.allEnabled ||
      notifDraft.verificationEnabled !== notif.verificationEnabled ||
      notifDraft.applicationEnabled !== notif.applicationEnabled ||
      notifDraft.resultEnabled !== notif.resultEnabled);

  const systemDirty =
    !!systemDraft &&
    !!system &&
    (systemDraft.dataMode !== system.dataMode ||
      systemDraft.registrationOpen !== system.registrationOpen ||
      systemDraft.ctApplicationsOpen !== system.ctApplicationsOpen ||
      systemDraft.ocrEnabled !== system.ocrEnabled ||
      systemDraft.maintenanceMode !== system.maintenanceMode);

  async function saveNotifications() {
    if (!notifDraft) return;
    setBusyNotif(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/notification-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allEnabled: notifDraft.allEnabled,
          verificationEnabled: notifDraft.verificationEnabled,
          applicationEnabled: notifDraft.applicationEnabled,
          resultEnabled: notifDraft.resultEnabled,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as NotificationSettings & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "Не удалось сохранить уведомления");
        return;
      }
      setNotif(json);
      setNotifDraft(json);
      setMessage("Настройки уведомлений сохранены");
    } finally {
      setBusyNotif(false);
    }
  }

  async function saveSystem() {
    if (!systemDraft) return;
    setBusySystem(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/system-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataMode: systemDraft.dataMode,
          registrationOpen: systemDraft.registrationOpen,
          ctApplicationsOpen: systemDraft.ctApplicationsOpen,
          ocrEnabled: systemDraft.ocrEnabled,
          maintenanceMode: systemDraft.maintenanceMode,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as SystemSettings & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "Не удалось сохранить системные настройки");
        return;
      }
      setSystem(json);
      setSystemDraft(json);
      setMessage("Системные настройки сохранены");
      window.dispatchEvent(new Event("abiturent:system-settings-changed"));
    } finally {
      setBusySystem(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Настройки
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Администрирование платформы: режим работы, доступы и уведомления.
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

      <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-text-muted">
              Система
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Режим данных и ключевые функции приёмной кампании.
            </p>
          </div>
          <FormButton
            type="button"
            className="w-auto px-4 py-2.5"
            disabled={busySystem || !systemDirty || loading || !systemDraft}
            onClick={() => void saveSystem()}
          >
            Сохранить
          </FormButton>
        </div>

        {loading || !systemDraft ? (
          <p className="mt-6 text-sm text-text-muted">Загрузка…</p>
        ) : (
          <div className="mt-6 space-y-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-text-primary">
                Режим данных
              </span>
              <FilterSelect
                value={systemDraft.dataMode}
                onChange={(e) =>
                  setSystemDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          dataMode: e.target.value as SystemSettings["dataMode"],
                        }
                      : prev,
                  )
                }
              >
                <option value="production">Продакшн</option>
                <option value="demo">Демо / тестовые данные</option>
              </FilterSelect>
              <span className="text-xs text-text-muted">
                Сейчас: {dataModeLabel(systemDraft.dataMode)}. Отображается в
                подвале бокового меню.
              </span>
            </label>

            {SYSTEM_TOGGLES.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 rounded-[12px] border border-border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary">{item.title}</p>
                  <p className="text-sm text-text-muted">{item.description}</p>
                </div>
                <Toggle
                  label={item.title}
                  checked={systemDraft[item.key]}
                  disabled={busySystem}
                  onChange={(v) =>
                    setSystemDraft((prev) =>
                      prev ? { ...prev, [item.key]: v } : prev,
                    )
                  }
                />
              </div>
            ))}

            {system?.updatedAt ? (
              <p className="text-xs text-text-muted">
                Обновлено:{" "}
                {new Date(system.updatedAt).toLocaleString("ru-RU")}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-text-muted">
              Уведомления
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Отключите все уведомления или отдельные типы событий.
            </p>
          </div>
          <FormButton
            type="button"
            className="w-auto px-4 py-2.5"
            disabled={busyNotif || !notifDirty || loading || !notifDraft}
            onClick={() => void saveNotifications()}
          >
            Сохранить
          </FormButton>
        </div>

        {loading || !notifDraft ? (
          <p className="mt-6 text-sm text-text-muted">Загрузка…</p>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-[12px] border border-border bg-[#f8fafc] px-4 py-3">
              <div className="min-w-0">
                <p className="font-bold text-brand-900">Все уведомления</p>
                <p className="text-sm text-text-muted">
                  Главный выключатель: при отключении новые уведомления не
                  создаются.
                </p>
              </div>
              <Toggle
                label="Все уведомления"
                checked={notifDraft.allEnabled}
                disabled={busyNotif}
                onChange={(v) =>
                  setNotifDraft((prev) =>
                    prev ? { ...prev, allEnabled: v } : prev,
                  )
                }
              />
            </div>

            <div
              className={cn("space-y-3", !notifDraft.allEnabled && "opacity-60")}
            >
              {KIND_TOGGLES.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 rounded-[12px] border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary">{item.title}</p>
                    <p className="text-sm text-text-muted">{item.description}</p>
                  </div>
                  <Toggle
                    label={item.title}
                    checked={notifDraft[item.key]}
                    disabled={busyNotif || !notifDraft.allEnabled}
                    onChange={(v) =>
                      setNotifDraft((prev) =>
                        prev ? { ...prev, [item.key]: v } : prev,
                      )
                    }
                  />
                </div>
              ))}
            </div>

            {notif?.updatedAt ? (
              <p className="text-xs text-text-muted">
                Обновлено: {new Date(notif.updatedAt).toLocaleString("ru-RU")}
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
