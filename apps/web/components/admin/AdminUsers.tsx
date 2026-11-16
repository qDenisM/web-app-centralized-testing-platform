"use client";

import { useEffect, useState } from "react";
import {
  type AdminUser,
  roleLabel,
  userStatusLabel,
} from "@/lib/admin";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";

const ROLES = ["applicant", "moderator", "examiner", "admin"] as const;

export function AdminUsers() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockId, setBlockId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState("Нарушение правил");
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function changeRole(userId: string, role: string) {
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось сменить роль");
        return;
      }
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function blockUser(userId: string) {
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: blockReason }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось заблокировать");
        return;
      }
      setBlockId(null);
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function unblockUser(userId: string) {
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/unblock`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось разблокировать");
        return;
      }
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Пользователи
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
        <button
          type="submit"
          className="rounded-[10px] bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
        >
          Найти
        </button>
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
              <th className="px-4 py-3">Действия</th>
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
                  <td className="px-4 py-3">
                    <select
                      className="rounded-[8px] border border-border px-2 py-1 text-sm"
                      value={user.role}
                      disabled={busyId === user.id}
                      onChange={(e) => void changeRole(user.id, e.target.value)}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {roleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </td>
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
                    {user.blockedReason ? (
                      <div className="mt-1 text-xs text-text-muted">{user.blockedReason}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {user.status === "blocked" ? (
                      <button
                        type="button"
                        disabled={busyId === user.id}
                        onClick={() => void unblockUser(user.id)}
                        className="text-sm font-semibold text-brand-700 hover:text-brand-900"
                      >
                        Разблокировать
                      </button>
                    ) : blockId === user.id ? (
                      <div className="space-y-2">
                        <input
                          className="w-full max-w-xs rounded-[8px] border border-border px-2 py-1 text-sm"
                          value={blockReason}
                          onChange={(e) => setBlockReason(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-sm font-semibold text-red-600"
                            onClick={() => void blockUser(user.id)}
                          >
                            Подтвердить
                          </button>
                          <button
                            type="button"
                            className="text-sm text-text-muted"
                            onClick={() => setBlockId(null)}
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === user.id}
                        onClick={() => setBlockId(user.id)}
                        className="text-sm font-semibold text-red-600 hover:text-red-800"
                      >
                        Заблокировать
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}