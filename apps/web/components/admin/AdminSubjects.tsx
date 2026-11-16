"use client";

import { useCallback, useEffect, useState } from "react";
import type { Subject } from "@/lib/admin";
import { Input } from "@/components/ui/Input";
import { FormButton } from "@/components/ui/FormButton";

export function AdminSubjects() {
  const [items, setItems] = useState<Subject[]>([]);
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subjects");
      const json = (await res.json().catch(() => ({}))) as Subject[] & { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось загрузить предметы");
        return;
      }
      setItems(Array.isArray(json) ? json : []);
    } catch {
      setError("Сеть недоступна.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createSubject(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, shortCode, status: "active" }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(json.error || "Не удалось создать предмет");
      return;
    }
    setName("");
    setShortCode("");
    await load();
  }

  async function remove(item: Subject) {
    if (!window.confirm(`Удалить «${item.name}»?`)) return;
    const res = await fetch(`/api/admin/subjects/${item.id}`, { method: "DELETE" });
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
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">Предметы</h1>
        <p className="mt-1 text-sm text-text-secondary">Справочник предметов ЦТ.</p>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(e) => void createSubject(e)}
        className="grid gap-3 rounded-[14px] border border-border bg-white p-5 sm:grid-cols-2"
      >
        <Input
          label="Название"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Код"
          name="shortCode"
          value={shortCode}
          onChange={(e) => setShortCode(e.target.value)}
          required
        />
        <FormButton type="submit" className="sm:col-span-2 sm:w-auto">
          Добавить предмет
        </FormButton>
      </form>

      <SubjectTable loading={loading} items={items} onRemove={remove} />
    </div>
  );
}

function SubjectTable({
  loading,
  items,
  onRemove,
}: {
  loading: boolean;
  items: Subject[];
  onRemove: (item: Subject) => Promise<void>;
}) {
  return (
    <div className="overflow-x-auto rounded-[14px] border border-border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-[#f8fafc] text-xs font-bold uppercase text-text-muted">
          <tr>
            <th className="px-4 py-3">Название</th>
            <th className="px-4 py-3">Код</th>
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
          ) : (
            items.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3 font-semibold">{item.name}</td>
                <td className="px-4 py-3">{item.shortCode}</td>
                <td className="px-4 py-3">{item.status}</td>
                <td className="px-4 py-3 text-right">
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