"use client";

import { useCallback, useEffect, useState } from "react";
import type { Subject } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { FormButton } from "@/components/ui/FormButton";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";

type SubjectStatus = "active" | "hidden";

const emptyForm = {
  name: "",
  shortCode: "",
  status: "active" as SubjectStatus,
};

function usageCountOf(item: Subject): number {
  return item.usageCount ?? 0;
}

function statusLabel(status: string): string {
  return status === "hidden" ? "Скрыт" : "Активен";
}

function pluralInSpecialties(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "специальности";
  return "специальностях";
}

export function AdminSubjects() {
  const [items, setItems] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subjects");
      const json = (await res.json().catch(() => ({}))) as Subject[] & {
        error?: string;
      };
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
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(item: Subject) {
    setEditing(item);
    setForm({
      name: item.name,
      shortCode: item.shortCode,
      status: item.status === "hidden" ? "hidden" : "active",
    });
    setModalOpen(true);
  }

  async function saveSubject() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        shortCode: form.shortCode.trim(),
        status: form.status,
      };
      const res = editing
        ? await fetch(`/api/admin/subjects/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/subjects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
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

  async function hideSubject() {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/subjects/${deleteTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "hidden" }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error || "Не удалось скрыть предмет");
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
    setError(null);
    try {
      const res = await fetch(`/api/admin/subjects/${deleteTarget.id}`, {
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

  const deleteUsageCount = deleteTarget ? usageCountOf(deleteTarget) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Предметы ЦТ
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Справочник дисциплин централизованного тестирования РИКЗ
          </p>
        </div>
        <FormButton type="button" className="w-auto px-4 py-2.5" onClick={openCreate}>
          + Добавить предмет
        </FormButton>
      </div>

      {error ? (
        <Alert>{error}</Alert>
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
        leading={
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E7F0F8] text-brand-800"
            aria-hidden
          >
            <span className="text-lg font-extrabold leading-none">Σ</span>
          </span>
        }
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
            label="Полное наименование"
            name="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="Краткое обозначение (до 5 символов)"
            name="shortCode"
            value={form.shortCode}
            maxLength={5}
            onChange={(e) =>
              setForm((f) => ({ ...f, shortCode: e.target.value.slice(0, 5) }))
            }
            required
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-text-secondary">
              Статус в приёмной кампании
            </span>
            <FilterSelect
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value === "hidden" ? "hidden" : "active",
                }))
              }
            >
              <option value="active">Активен (Сдается)</option>
              <option value="hidden">Скрыт</option>
            </FilterSelect>
          </label>
        </div>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Удаление предмета"
        subtitle={
          deleteUsageCount > 0
            ? "Проверка связанных специальностей"
            : undefined
        }
        leading={
          deleteUsageCount > 0 ? (
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6E7A8] text-[#8A6A00]"
              aria-hidden
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
                <path
                  d="M10 4.5L17 16.5H3L10 4.5Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 8.5v3.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="10" cy="14.2" r="1" fill="currentColor" />
              </svg>
            </span>
          ) : undefined
        }
        footer={
          <>
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto px-4 py-2.5"
              disabled={busy}
              onClick={() => setDeleteTarget(null)}
            >
              Отмена
            </FormButton>
            {deleteUsageCount > 0 ? (
              <FormButton
                type="button"
                variant="secondary"
                className="w-auto px-4 py-2.5"
                disabled={busy}
                onClick={() => void hideSubject()}
              >
                Скрыть предмет
              </FormButton>
            ) : null}
            <FormButton
              type="button"
              variant="destructive"
              className="w-auto px-4 py-2.5"
              disabled={busy}
              onClick={() => void hardDelete()}
            >
              {deleteUsageCount > 0 ? "Всё равно удалить" : "Удалить"}
            </FormButton>
          </>
        }
      >
        {deleteUsageCount > 0 ? (
          <div className="space-y-3">
            <div className="rounded-[12px] border border-[#E6C65C] bg-[#FFF8DF] px-4 py-3 text-sm font-medium leading-relaxed text-[#8A6A00]">
              Внимание: предмет «{deleteTarget?.name}» используется в{" "}
              {deleteUsageCount} {pluralInSpecialties(deleteUsageCount)}.
              Удаление может нарушить настройки специальностей и исторические
              данные.
            </div>
            <p className="text-sm leading-relaxed text-text-secondary">
              Рекомендуется перевести предмет в статус «Скрыт» вместо физического
              удаления из базы.
            </p>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-text-secondary">
            Удалить предмет «{deleteTarget?.name}»?
          </p>
        )}
      </Modal>
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
    <div className="overflow-x-auto rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-[#f8fafc] text-xs font-bold uppercase tracking-wide text-text-muted">
          <tr>
            <th className="px-4 py-3">Дисциплина</th>
            <th className="px-4 py-3">Кратко</th>
            <th className="px-4 py-3 text-center">Используется в специальностях</th>
            <th className="px-4 py-3">Статус</th>
            <th className="px-4 py-3">Действия</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-text-muted">
                Загрузка…
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-text-muted">
                Нет записей
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const hidden = item.status === "hidden";
              return (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold text-brand-900">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{item.shortCode}</td>
                  <td className="px-4 py-3 text-center font-bold text-brand-900">
                    {usageCountOf(item)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                        hidden
                          ? "bg-[#eef2f5] text-text-secondary"
                          : "bg-[#E4F6EC] text-[#176B45]",
                      )}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <FormButton
                        type="button"
                        variant="secondary"
                        className="w-auto shrink-0 px-3 py-1.5 text-xs"
                        onClick={() => onEdit(item)}
                      >
                        Изменить
                      </FormButton>
                      <button
                        type="button"
                        onClick={() => onRemove(item)}
                        className="text-xs font-semibold text-[#c0392b] hover:underline"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
