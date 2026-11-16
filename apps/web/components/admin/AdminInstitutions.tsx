"use client";

import { useCallback, useEffect, useState } from "react";
import type { Institution } from "@/lib/admin";
import { Input } from "@/components/ui/Input";
import { FormButton } from "@/components/ui/FormButton";

const emptyForm = {
  type: "university",
  shortName: "",
  fullName: "",
  city: "",
  isPublished: false,
};

export function AdminInstitutions() {
  const [items, setItems] = useState<Institution[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/institutions");
      const json = (await res.json().catch(() => ({}))) as Institution[] & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "Не удалось загрузить вузы");
        return;
      }
      setItems(Array.isArray(json) ? json : []);
    } catch {
      setError("Сеть недоступна. Проверьте catalog-service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createInstitution(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/institutions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        city: form.city || null,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(json.error || "Не удалось создать вуз");
      return;
    }
    setForm(emptyForm);
    await load();
  }

  async function togglePublished(item: Institution) {
    const res = await fetch(`/api/admin/institutions/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !item.isPublished }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error || "Не удалось обновить");
      return;
    }
    await load();
  }

  async function remove(item: Institution) {
    if (!window.confirm(`Удалить «${item.shortName}»?`)) return;
    const res = await fetch(`/api/admin/institutions/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error || "Не удалось удалить");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Университеты и колледжи
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          CRUD учебных заведений каталога.
        </p>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(e) => void createInstitution(e)}
        className="grid gap-3 rounded-[14px] border border-border bg-white p-5 sm:grid-cols-2"
      >
        <Input
          label="Краткое название"
          name="shortName"
          value={form.shortName}
          onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))}
          required
        />
        <Input
          label="Полное название"
          name="fullName"
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          required
        />
        <Input
          label="Город"
          name="city"
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
        />
        <label className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
          />
          Опубликован в каталоге
        </label>
        <FormButton type="submit" className="sm:col-span-2 sm:w-auto">
          Добавить вуз
        </FormButton>
      </form>

      <InstitutionTable
        loading={loading}
        items={items}
        onToggle={togglePublished}
        onRemove={remove}
      />
    </div>
  );
}

function InstitutionTable({
  loading,
  items,
  onToggle,
  onRemove,
}: {
  loading: boolean;
  items: Institution[];
  onToggle: (item: Institution) => Promise<void>;
  onRemove: (item: Institution) => Promise<void>;
}) {
  return (
    <div className="overflow-x-auto rounded-[14px] border border-border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-[#f8fafc] text-xs font-bold uppercase text-text-muted">
          <tr>
            <th className="px-4 py-3">Название</th>
            <th className="px-4 py-3">Город</th>
            <th className="px-4 py-3">Публикация</th>
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
            items.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-semibold">{item.shortName}</div>
                  <div className="text-xs text-text-muted">{item.fullName}</div>
                </td>
                <td className="px-4 py-3">{item.city || "—"}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => void onToggle(item)}
                    className="text-sm font-semibold text-brand-700"
                  >
                    {item.isPublished ? "Опубликован" : "Скрыт"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => void onRemove(item)}
                    className="text-sm font-semibold text-red-600"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}