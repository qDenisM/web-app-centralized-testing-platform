"use client";

import { useCallback, useEffect, useState } from "react";
import type { Subject } from "@/lib/admin";
import { Input } from "@/components/ui/Input";
import { FormButton } from "@/components/ui/FormButton";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function AdminSubjects() {
  const [items, setItems] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [busy, setBusy] = useState(false);

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

  function openCreate() {
    setEditing(null);
    setName("");
    setShortCode("");
    setModalOpen(true);
  }

  function openEdit(item: Subject) {
    setEditing(item);
    setName(item.name);
    setShortCode(item.shortCode);
    setModalOpen(true);
  }

  async function saveSubject() {
    setBusy(true);
    try {
      const res = editing
        ? await fetch(`/api/admin/subjects/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, shortCode, status: editing.status }),
          })
        : await fetch("/api/admin/subjects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, shortCode, status: "active" }),
          });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось сохранить");
        return;
      }
      setModalOpen(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/subjects/${deleteTarget.id}`, { method: "DELETE" });
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
            Предметы ЦТ
          </h1>
          <p className="mt-1 text-sm text-text-secondary">Справочник предметов ЦТ.</p>
        </div>
        <FormButton type="button" className="w-auto px-4 py-2.5" onClick={openCreate}>
          + Предмет
        </FormButton>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <SubjectTable
        loading={loading}
        items={items}
        onEdit={openEdit}
        onRemove={setDeleteTarget}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Предмет ЦТ"
        footer={
          <>
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto px-4 py-2.5"
              onClick={() => setModalOpen(false)}
              disabled={busy}
            >
              Отмена
            </FormButton>
            <FormButton
              type="button"
              className="w-auto px-4 py-2.5"
              disabled={busy}
              onClick={() => void saveSubject()}
            >
              Сохранить
            </FormButton>
          </>
        }
      >
        <div className="grid gap-3">
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
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Удаление предмета"
        confirmLabel="Удалить"
        variant="destructive"
        busy={busy}
        onConfirm={() => void confirmDelete()}
      >
        Удалить предмет «{deleteTarget?.name}»?
      </ConfirmDialog>
    </div>
  );
}

function SubjectTable({
  loading,
  items,
  onEdit,
  onRemove,
}: {
  loading: boolean;
  items: Subject[];
  onEdit: (item: Subject) => void;
  onRemove: (item: Subject) => void;
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
                    onClick={() => onEdit(item)}
                    className="mr-3 text-sm font-semibold text-brand-700"
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(item)}
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