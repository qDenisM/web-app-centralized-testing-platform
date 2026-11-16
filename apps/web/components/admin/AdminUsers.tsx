"use client";

import { useEffect, useState } from "react";
import {
  type AdminUser,
  type AuditLogItem,
  auditActionLabel,
  roleLabel,
  userStatusLabel,
} from "@/lib/admin";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormButton } from "@/components/ui/FormButton";

const ROLES = ["applicant", "moderator", "examiner", "admin"] as const;

type DrawerTab = "profile" | "role" | "history";

export function AdminUsers() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [drawerUser, setDrawerUser] = useState<AdminUser | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("profile");
  const [pendingRole, setPendingRole] = useState("");
  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);

  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockTerm, setBlockTerm] = useState("");
  const [auditItems, setAuditItems] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = (await res.json().catch(() => ({}))) as {
        items?: AdminUser[];
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "Не удалось загрузить пользователей");
        return;
      }
      setItems(json.items || []);
    } catch {
      setError("Сеть недоступна. Проверьте identity-service.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [query]);

  useEffect(() => {
    if (!drawerUser || drawerTab !== "history") {
      return;
    }
    let cancelled = false;
    async function loadAudit() {
      setAuditLoading(true);
      setAuditError(null);
      try {
        const res = await fetch(`/api/admin/users/${drawerUser!.id}/audit`);
        const json = (await res.json().catch(() => ({}))) as {
          items?: AuditLogItem[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setAuditError(json.error || "Не удалось загрузить журнал");
          setAuditItems([]);
          return;
        }
        setAuditItems(json.items || []);
      } catch {
        if (!cancelled) setAuditError("Сеть недоступна");
      } finally {
        if (!cancelled) setAuditLoading(false);
      }
    }
    void loadAudit();
    return () => {
      cancelled = true;
    };
  }, [drawerUser, drawerTab]);

  function openDrawer(user: AdminUser) {
    setDrawerUser(user);
    setDrawerTab("profile");
    setPendingRole(user.role);
    setAuditItems([]);
    setAuditError(null);
  }

  async function applyRole() {
    if (!drawerUser) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${drawerUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: pendingRole }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось сменить роль");
        return;
      }
      setRoleConfirmOpen(false);
      await reload();
      const updated = items.find((u) => u.id === drawerUser.id);
      if (updated) setDrawerUser({ ...updated, role: pendingRole });
    } finally {
      setBusy(false);
    }
  }

  async function applyBlock() {
    if (!drawerUser) return;
    setBusy(true);
    setError(null);
    try {
      const body: { reason: string; blockedUntil?: string } = {
        reason: blockReason.trim() || "Нарушение правил",
      };
      if (blockTerm) {
        body.blockedUntil = new Date(blockTerm).toISOString();
      }
      const res = await fetch(`/api/admin/users/${drawerUser.id}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось заблокировать");
        return;
      }
      setBlockOpen(false);
      setBlockReason("");
      setBlockTerm("");
      setDrawerUser(null);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function unblock(userId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/unblock`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setError(json.error || "Не удалось разблокировать");
      else await reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Управление пользователями
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Роли, блокировка и аудит действий администратора.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
        }}
      >
        <div className="min-w-[220px] flex-1">
          <Input
            label="Поиск"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Email или ФИО"
          />
        </div>
        <FormButton type="submit" className="w-auto px-4 py-2.5">
          Найти
        </FormButton>
      </form>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-[14px] border border-border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-[#f8fafc] text-xs font-bold uppercase text-text-muted">
            <tr>
              <th className="px-4 py-3">Пользователь</th>
              <th className="px-4 py-3">Роль</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-text-muted">
                  Загрузка…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-text-muted">
                  Нет записей
                </td>
              </tr>
            ) : (
              items.map((user) => (
                <tr key={user.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-text-primary">{user.fullName}</div>
                    <div className="text-xs text-text-muted">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">{roleLabel(user.role)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        user.status === "blocked"
                          ? "bg-red-50 text-red-700"
                          : "bg-brand-50 text-brand-800",
                      )}
                    >
                      {userStatusLabel(user.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openDrawer(user)}
                      className="text-sm font-bold text-brand-700 hover:text-brand-900"
                    >
                      Карточка
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Drawer
        open={drawerUser !== null}
        onClose={() => setDrawerUser(null)}
        title="Карточка пользователя"
        widthClassName="max-w-md"
      >
        {drawerUser ? (
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-border pb-2">
              {(
                [
                  ["profile", "Профиль"],
                  ["role", "Роль и доступ"],
                  ["history", "История"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDrawerTab(key)}
                  className={cn(
                    "rounded-[8px] px-3 py-1.5 text-sm font-bold",
                    drawerTab === key
                      ? "bg-brand-700 text-white"
                      : "text-text-secondary hover:bg-[#f8fafc]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {drawerTab === "profile" ? (
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-text-muted">ФИО</dt>
                  <dd className="font-semibold text-text-primary">{drawerUser.fullName}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Email</dt>
                  <dd className="font-semibold">{drawerUser.email}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Телефон</dt>
                  <dd>{drawerUser.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Статус</dt>
                  <dd>{userStatusLabel(drawerUser.status)}</dd>
                </div>
                {drawerUser.blockedReason ? (
                  <div>
                    <dt className="text-text-muted">Причина блокировки</dt>
                    <dd>{drawerUser.blockedReason}</dd>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-2">
                  {drawerUser.status === "blocked" ? (
                    <FormButton
                      type="button"
                      className="w-auto px-4 py-2"
                      disabled={busy}
                      onClick={() => void unblock(drawerUser.id)}
                    >
                      Разблокировать
                    </FormButton>
                  ) : (
                    <FormButton
                      type="button"
                      variant="destructive"
                      className="w-auto px-4 py-2"
                      onClick={() => setBlockOpen(true)}
                    >
                      Блокировать доступ
                    </FormButton>
                  )}
                </div>
              </dl>
            ) : null}

            {drawerTab === "role" ? (
              <div className="space-y-3 text-sm">
                <label className="block space-y-1.5">
                  <span className="font-semibold text-text-secondary">Роль</span>
                  <select
                    className="w-full rounded-[10px] border border-border px-3 py-2"
                    value={pendingRole}
                    onChange={(e) => setPendingRole(e.target.value)}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel(role)}
                      </option>
                    ))}
                  </select>
                </label>
                <FormButton
                  type="button"
                  className="w-auto px-4 py-2"
                  disabled={pendingRole === drawerUser.role}
                  onClick={() => setRoleConfirmOpen(true)}
                >
                  Сменить роль
                </FormButton>
              </div>
            ) : null}

            {drawerTab === "history" ? (
              <div className="space-y-3 text-sm">
                <p className="rounded-[10px] bg-[#f8fafc] px-3 py-2 text-text-secondary">
                  Создан:{" "}
                  {new Date(drawerUser.createdAt).toLocaleString("ru-RU")}
                </p>
                {auditLoading ? (
                  <p className="text-text-muted">Загрузка журнала…</p>
                ) : auditError ? (
                  <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                    {auditError}
                  </p>
                ) : auditItems.length === 0 ? (
                  <p className="text-text-muted">Записей в журнале пока нет.</p>
                ) : (
                  <ul className="max-h-72 space-y-2 overflow-y-auto">
                    {auditItems.map((row) => (
                      <li
                        key={row.id}
                        className="rounded-[10px] border border-border bg-[#f8fafc] px-3 py-2"
                      >
                        <div className="font-semibold text-text-primary">
                          {auditActionLabel(row.action)}
                        </div>
                        <div className="mt-0.5 text-xs text-text-muted">
                          {new Date(row.createdAt).toLocaleString("ru-RU")}
                          {row.actor
                            ? ` · ${row.actor.fullName}`
                            : " · система"}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={roleConfirmOpen}
        onClose={() => setRoleConfirmOpen(false)}
        title="Подтверждение смены роли"
        confirmLabel="Подтвердить"
        busy={busy}
        onConfirm={() => void applyRole()}
      >
        Пользователь получит роль «{roleLabel(pendingRole)}». Продолжить?
      </ConfirmDialog>

      <Modal
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        title="Блокировка доступа пользователя"
        footer={
          <>
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto px-4 py-2.5"
              onClick={() => setBlockOpen(false)}
              disabled={busy}
            >
              Отмена
            </FormButton>
            <FormButton
              type="button"
              variant="destructive"
              className="w-auto px-4 py-2.5"
              disabled={busy || !blockReason.trim()}
              onClick={() => void applyBlock()}
            >
              Заблокировать
            </FormButton>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <label className="block space-y-1.5">
            <span className="font-semibold text-text-secondary">Причина</span>
            <textarea
              rows={3}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="w-full rounded-[10px] border border-border px-3 py-2"
              placeholder="Опишите основание блокировки"
            />
          </label>
          <Input
            label="Срок (до даты)"
            name="blockTerm"
            type="date"
            value={blockTerm}
            onChange={(e) => setBlockTerm(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}