"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type AdminUser,
  type AuditLogItem,
  auditActionLabel,
  roleLabel,
  userStatusLabel,
} from "@/lib/admin";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormButton } from "@/components/ui/FormButton";

const ROLES = ["applicant", "moderator", "examiner", "admin"] as const;
const PAGE_SIZE = 10;

type DrawerTab = "profile" | "role" | "history";

function todayInputValue(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function endOfLocalDayIso(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

function formatBlockedUntil(iso: string | null): string {
  if (!iso) return "Бессрочно";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Бессрочно";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatLastLogin(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startToday.getTime() - startThat.getTime()) / 86_400_000,
  );
  const time = d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (diffDays === 0) return `Сегодня, ${time}`;
  if (diffDays === 1) return `Вчера, ${time}`;
  return formatDateShort(iso);
}

function csvEscape(value: string): string {
  if (/[",;\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function AdminUsers() {
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [items, setItems] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);

  const [drawerUser, setDrawerUser] = useState<AdminUser | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("profile");
  const [pendingRole, setPendingRole] = useState("");
  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockTerm, setBlockTerm] = useState("");
  const [blockError, setBlockError] = useState<string | null>(null);
  const [auditItems, setAuditItems] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const minBlockDate = todayInputValue();

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
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
      setPage(1);
      setSelected(new Set());
    } catch {
      setError("Сеть недоступна. Проверьте identity-service.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // q applied explicitly via «Найти»; role/status refresh the list immediately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, statusFilter]);

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

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  const allPageSelected =
    pageItems.length > 0 && pageItems.every((u) => selected.has(u.id));

  function openDrawer(user: AdminUser) {
    setDrawerUser(user);
    setDrawerTab("profile");
    setPendingRole(user.role);
    setAuditItems([]);
    setAuditError(null);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const u of pageItems) next.delete(u.id);
      } else {
        for (const u of pageItems) next.add(u.id);
      }
      return next;
    });
  }

  function exportCsv() {
    const rows = [
      ["ФИО", "Email", "Роль", "Статус", "Регистрация", "Последний вход"],
      ...items.map((u) => [
        u.fullName,
        u.email,
        roleLabel(u.role),
        userStatusLabel(u.status),
        formatDateShort(u.createdAt),
        formatLastLogin(u.lastLoginAt),
      ]),
    ];
    const csv = rows.map((r) => r.map(csvEscape).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${todayInputValue()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function applyRole() {
    if (!drawerUser) return;
    setBusy(true);
    setRoleError(null);
    try {
      const res = await fetch(`/api/admin/users/${drawerUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: pendingRole }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setRoleError(json.error || "Не удалось сменить роль");
        return;
      }
      setRoleConfirmOpen(false);
      await reload();
      setDrawerUser((prev) => (prev ? { ...prev, role: pendingRole } : prev));
    } finally {
      setBusy(false);
    }
  }

  function blockValidationMessage(details: unknown): string | null {
    if (!details || typeof details !== "object") return null;
    const fieldErrors = (details as { fieldErrors?: Record<string, string[]> })
      .fieldErrors;
    if (!fieldErrors) return null;
    const reason = fieldErrors.reason?.[0];
    if (reason) return reason;
    const until = fieldErrors.blockedUntil?.[0];
    if (until) return until;
    const first = Object.values(fieldErrors).flat()[0];
    return first || null;
  }

  async function applyBlock() {
    if (!drawerUser) return;
    setBusy(true);
    setBlockError(null);

    const reason = blockReason.trim();
    if (reason.length < 2) {
      setBlockError("Укажите причину блокировки (минимум 2 символа)");
      setBusy(false);
      return;
    }

    if (blockTerm && blockTerm < minBlockDate) {
      setBlockError("Дата окончания блокировки не может быть в прошлом");
      setBusy(false);
      return;
    }

    try {
      const body: { reason: string; blockedUntil?: string } = { reason };
      if (blockTerm) {
        body.blockedUntil = endOfLocalDayIso(blockTerm);
      }
      const res = await fetch(`/api/admin/users/${drawerUser.id}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        details?: unknown;
        blockedReason?: string | null;
        blockedUntil?: string | null;
        status?: string;
      };
      if (!res.ok) {
        setBlockError(
          blockValidationMessage(json.details) ||
            (json.error === "Validation failed"
              ? "Проверьте причину и дату блокировки"
              : null) ||
            json.error ||
            "Не удалось заблокировать",
        );
        return;
      }
      setBlockOpen(false);
      setBlockReason("");
      setBlockTerm("");
      setBlockError(null);
      setDrawerUser((prev) =>
        prev
          ? {
              ...prev,
              status: json.status || "blocked",
              blockedReason: json.blockedReason ?? body.reason,
              blockedUntil: json.blockedUntil ?? body.blockedUntil ?? null,
            }
          : prev,
      );
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function unblock(userId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/unblock`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось разблокировать");
        return;
      }
      setDrawerUser((prev) =>
        prev && prev.id === userId
          ? {
              ...prev,
              status: "active",
              blockedReason: null,
              blockedUntil: null,
            }
          : prev,
      );
      await reload();
    } finally {
      setBusy(false);
    }
  }

  const pageButtons = useMemo(() => {
    const buttons: Array<number | "…"> = [];
    if (pageCount <= 7) {
      for (let i = 1; i <= pageCount; i++) buttons.push(i);
      return buttons;
    }
    buttons.push(1);
    if (page > 3) buttons.push("…");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(pageCount - 1, page + 1);
      i++
    ) {
      buttons.push(i);
    }
    if (page < pageCount - 2) buttons.push("…");
    buttons.push(pageCount);
    return buttons;
  }, [page, pageCount]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Управление пользователями
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Редактирование профилей, смена ролей, аудит и блокировки
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FormButton
            type="button"
            variant="secondary"
            className="w-auto px-4 py-2.5"
            onClick={exportCsv}
            disabled={items.length === 0}
          >
            Экспорт CSV
          </FormButton>
        </div>
      </div>

      <section className="rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
        <form
          className="flex flex-wrap items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void reload();
          }}
        >
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Поиск</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden>
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M14 14l3 3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по ФИО или email…"
              className="w-full rounded-[10px] border border-border bg-white py-2.5 pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <FilterSelect
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
            }}
            className="min-w-[150px]"
          >
            <option value="">Все роли</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
            }}
            className="min-w-[150px]"
          >
            <option value="">Все статусы</option>
            <option value="active">Активен</option>
            <option value="blocked">Заблокирован</option>
          </FilterSelect>
          <FormButton type="submit" className="w-auto px-4 py-2.5">
            Найти
          </FormButton>
        </form>
      </section>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-[#f8fafc] text-xs font-bold uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-3">Пользователь</th>
                <th className="px-4 py-3">Роль</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Регистрация</th>
                <th className="px-4 py-3">Последний вход</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-text-muted">
                    Загрузка…
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-text-muted">
                    Нет записей
                  </td>
                </tr>
              ) : (
                pageItems.map((user) => (
                  <tr key={user.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-text-primary">
                        {user.fullName}
                      </div>
                      <div className="text-xs text-text-muted">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {roleLabel(user.role)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                          user.status === "blocked"
                            ? "bg-[#FDECEC] text-[#9B2C2C]"
                            : "bg-[#E4F6EC] text-[#176B45]",
                        )}
                      >
                        {userStatusLabel(user.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {formatDateShort(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {formatLastLogin(user.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openDrawer(user)}
                        className="rounded-[10px] border border-border bg-white px-3 py-1.5 text-sm font-bold text-brand-800 hover:bg-[#f4f7f9]"
                      >
                        Редактировать
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-xs text-text-muted">
            {items.length === 0
              ? "Нет пользователей"
              : `Показано ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, items.length)} из ${items.length} пользователей`}
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-[8px] border border-border px-2.5 py-1.5 text-xs font-bold text-brand-800 disabled:opacity-40"
            >
              Пред
            </button>
            {pageButtons.map((btn, idx) =>
              btn === "…" ? (
                <span
                  key={`e-${idx}`}
                  className="px-1 text-xs text-text-muted"
                >
                  …
                </span>
              ) : (
                <button
                  key={btn}
                  type="button"
                  onClick={() => setPage(btn)}
                  className={cn(
                    "min-w-8 rounded-[8px] border px-2.5 py-1.5 text-xs font-bold",
                    page === btn
                      ? "border-brand-700 bg-brand-700 text-white"
                      : "border-border text-brand-800 hover:bg-[#f4f7f9]",
                  )}
                >
                  {btn}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="rounded-[8px] border border-border px-2.5 py-1.5 text-xs font-bold text-brand-800 disabled:opacity-40"
            >
              След
            </button>
          </div>
        </div>
      </section>

      <Drawer
        open={drawerUser !== null}
        onClose={() => {
          setDrawerUser(null);
          setBlockOpen(false);
          setBlockError(null);
          setRoleConfirmOpen(false);
          setRoleError(null);
        }}
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
                  <dd className="font-semibold text-text-primary">
                    {drawerUser.fullName}
                  </dd>
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
                <div>
                  <dt className="text-text-muted">Регистрация</dt>
                  <dd>{formatDateShort(drawerUser.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Последний вход</dt>
                  <dd>{formatLastLogin(drawerUser.lastLoginAt)}</dd>
                </div>
                {drawerUser.status === "blocked" ? (
                  <>
                    <div>
                      <dt className="text-text-muted">Причина блокировки</dt>
                      <dd>{drawerUser.blockedReason || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">Заблокирован до</dt>
                      <dd className="font-semibold text-[#9B2C2C]">
                        {formatBlockedUntil(drawerUser.blockedUntil)}
                      </dd>
                    </div>
                  </>
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
                      onClick={() => {
                        setBlockError(null);
                        setBlockReason("");
                        setBlockTerm("");
                        setBlockOpen(true);
                      }}
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
                  onClick={() => {
                    setRoleError(null);
                    setRoleConfirmOpen(true);
                  }}
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
        onClose={() => {
          setRoleConfirmOpen(false);
          setRoleError(null);
        }}
        title="Подтверждение смены роли"
        confirmLabel="Подтвердить"
        busy={busy}
        error={roleError}
        onConfirm={() => void applyRole()}
      >
        Пользователь получит роль «{roleLabel(pendingRole)}». Продолжить?
      </ConfirmDialog>

      <Modal
        open={blockOpen}
        onClose={() => {
          setBlockOpen(false);
          setBlockError(null);
        }}
        title="Блокировка доступа пользователя"
        footer={
          <>
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto px-4 py-2.5"
              onClick={() => {
                setBlockOpen(false);
                setBlockError(null);
              }}
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
              onChange={(e) => {
                setBlockReason(e.target.value);
                if (blockError) setBlockError(null);
              }}
              className="w-full rounded-[10px] border border-border px-3 py-2"
              placeholder="Опишите основание блокировки (минимум 2 символа)"
            />
          </label>
          <Input
            label="Срок (до даты)"
            name="blockTerm"
            type="date"
            min={minBlockDate}
            value={blockTerm}
            onChange={(e) => {
              setBlockTerm(e.target.value);
              if (blockError) setBlockError(null);
            }}
          />
          <p className="text-xs text-text-muted">
            Пустая дата — бессрочная блокировка. Нельзя выбрать прошедшую дату.
          </p>
          {blockError ? (
            <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-700">
              {blockError}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Добавить пользователя"
        size="sm"
        footer={
          <FormButton
            type="button"
            className="w-auto px-4 py-2.5"
            onClick={() => setAddOpen(false)}
          >
            Понятно
          </FormButton>
        }
      >
        <p className="text-sm leading-relaxed text-text-secondary">
          Создание учётной записи администратором пока недоступно. Новый
          пользователь регистрируется через публичную форму{" "}
          <span className="font-semibold text-brand-800">/register</span>.
        </p>
      </Modal>
    </div>
  );
}
