"use client";

import { useCallback, useEffect, useState } from "react";
import type { Institution } from "@/lib/admin";
import { Input } from "@/components/ui/Input";
import { FormButton } from "@/components/ui/FormButton";
import { Modal } from "@/components/ui/Modal";

const emptyForm = {
  type: "university",
  shortName: "",
  fullName: "",
  city: "",
  isPublished: false,
};

export function AdminInstitutions() {
  const [items, setItems] = useState<Institution[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Institution | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Institution | null>(null);
  const [busy, setBusy] = useState(false);

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

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setEditOpen(true);
  }

  function openEdit(item: Institution) {
    setEditing(item);
    setForm({
      type: item.type,
      shortName: item.shortName,
      fullName: item.fullName,
      city: item.city || "",
      isPublished: item.isPublished,
    });
    setEditOpen(true);
  }

  async function saveInstitution() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        ...form,
        city: form.city || null,
      };
      const res = editing
        ? await fetch(`/api/admin/institutions/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/institutions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось сохранить");
        return;
      }
      setEditOpen(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function hideFromCatalog() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/institutions/${deleteTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: false }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error || "Не удалось скрыть");
        return;
      }
      setDeleteTarget(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function hardDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/institutions/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error || "Не удалось удалить");
        return;
      }
      setDeleteTarget(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Университеты и колледжи
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Справочник учебных заведений каталога.
          </p>
        </div>
        <FormButton type="button" className="w-auto px-4 py-2.5" onClick={openCreate}>
          + Добавить заведение
        </FormButton>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <InstitutionTable
        loading={loading}
        items={items}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Параметры заведения"
        footer={
          <>
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto px-4 py-2.5"
              onClick={() => setEditOpen(false)}
              disabled={busy}
            >
              Отмена
            </FormButton>
            <FormButton
              type="button"
              className="w-auto px-4 py-2.5"
              disabled={busy}
              onClick={() => void saveInstitution()}
            >
              Сохранить
            </FormButton>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
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
          <label className="flex items-center gap-2 text-sm font-semibold text-text-secondary sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
            />
            Опубликован в каталоге
          </label>
        </div>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Удаление учебного заведения"
        footer={
          <>
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto px-4 py-2.5"
              disabled={busy}
              onClick={() => void hideFromCatalog()}
            >
              Скрыть из каталога
            </FormButton>
            <FormButton
              type="button"
              variant="destructive"
              className="w-auto px-4 py-2.5"
              disabled={busy}
              onClick={() => void hardDelete()}
            >
              Всё равно удалить
            </FormButton>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          Заведение «{deleteTarget?.shortName}». Скрытие уберёт его из каталога для
          абитуриентов, полное удаление необратимо.
        </p>
      </Modal>
    </div>
  );
}

function InstitutionTable({
  loading,
  items,
  onEdit,
  onDelete,
}: {
  loading: boolean;
  items: Institution[];
  onEdit: (item: Institution) => void;
  onDelete: (item: Institution) => void;
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
                  {item.isPublished ? "Опубликован" : "Скрыт"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="text-sm font-semibold text-brand-700"
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      className="text-sm font-semibold text-red-600"
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}