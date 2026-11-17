"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Institution } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { FormButton } from "@/components/ui/FormButton";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Modal } from "@/components/ui/Modal";

type TypeFilter = "all" | "university" | "college";

const emptyForm = {
  type: "university",
  shortName: "",
  fullName: "",
  city: "",
  website: "",
  address: "",
  isPublished: true,
};

function typeLabel(type: string): string {
  if (type === "university") return "Университет";
  if (type === "college") return "Колледж";
  return type;
}

function specialtiesCountOf(item: Institution): number {
  return item.specialtiesCount ?? 0;
}

export function AdminInstitutions() {
  const [items, setItems] = useState<Institution[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Institution | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Institution | null>(null);
  const [busy, setBusy] = useState(false);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");

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

  const counts = useMemo(() => {
    const university = items.filter((i) => i.type === "university").length;
    const college = items.filter((i) => i.type === "college").length;
    return { all: items.length, university, college };
  }, [items]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const city = item.city?.trim();
      if (city) set.add(city);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (cityFilter && (item.city || "") !== cityFilter) return false;
      if (q) {
        const hay = `${item.shortName} ${item.fullName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, typeFilter, cityFilter, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setEditOpen(true);
  }

  function openEdit(item: Institution) {
    setEditing(item);
    setForm({
      type: item.type === "college" ? "college" : "university",
      shortName: item.shortName,
      fullName: item.fullName,
      city: item.city || "",
      website: item.website || "",
      address: item.address || "",
      isPublished: item.isPublished,
    });
    setEditOpen(true);
  }

  async function saveInstitution() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        type: form.type,
        shortName: form.shortName.trim(),
        fullName: form.fullName.trim(),
        city: form.city.trim() || null,
        website: form.website.trim() || null,
        address: form.address.trim() || null,
        isPublished: form.isPublished,
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

  const deleteSpecialtyCount = deleteTarget
    ? specialtiesCountOf(deleteTarget)
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Университеты и колледжи
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Справочник высших и средних специальных учебных заведений Беларуси
          </p>
        </div>
        <FormButton type="button" className="w-auto px-4 py-2.5" onClick={openCreate}>
          Добавить заведение
        </FormButton>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="space-y-3 rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "all", label: `Все (${counts.all})` },
              { id: "university", label: `Университеты (${counts.university})` },
              { id: "college", label: `Колледжи (${counts.college})` },
            ] as const
          ).map((tab) => {
            const active = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-brand-700 text-white"
                    : "border border-border bg-white text-text-secondary hover:bg-[#f8fafc] hover:text-text-primary",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию..."
              className="w-full rounded-[10px] border border-border bg-white py-2.5 pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <FilterSelect
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="min-w-[160px]"
          >
            <option value="">Все города</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </FilterSelect>
          <p className="ml-auto text-sm text-text-muted whitespace-nowrap">
            Найдено записей: {filtered.length}
          </p>
        </div>
      </section>

      <InstitutionTable
        loading={loading}
        items={filtered}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Параметры заведения"
        subtitle={
          editing
            ? "Редактирование профиля вуза или колледжа"
            : "Добавление вуза или колледжа в справочник"
        }
        size="md"
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
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-text-secondary">
              Тип учреждения
            </span>
            <FilterSelect
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value }))
              }
            >
              <option value="university">Университет (ВУЗ)</option>
              <option value="college">Колледж</option>
            </FilterSelect>
          </label>
          <Input
            label="Краткое наименование"
            name="shortName"
            value={form.shortName}
            onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))}
            required
          />
          <Input
            label="Полное наименование"
            name="fullName"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Город"
              name="city"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
            <Input
              label="Официальный сайт"
              name="website"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              placeholder="example.by"
            />
          </div>
          <Input
            label="Адрес приёмной комиссии"
            name="address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) =>
                setForm((f) => ({ ...f, isPublished: e.target.checked }))
              }
            />
            Опубликован в каталоге
          </label>
        </div>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Удаление учебного заведения"
        subtitle="Проверка связанных специальностей"
        leading={
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6E7A8] text-[#5C4A00]"
            aria-hidden
          >
            <span className="text-lg font-black leading-none">!</span>
          </span>
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
        <div className="space-y-3">
          <div className="rounded-[12px] border border-[#E6C65C] bg-[#FFF8DF] px-4 py-3 text-sm font-medium leading-relaxed text-[#8A6A00]">
            Внимание: В учреждении {deleteTarget?.shortName} зарегистрировано{" "}
            {deleteSpecialtyCount}{" "}
            {pluralSpecialties(deleteSpecialtyCount)}. Полное удаление приведет к
            потере исторических конкурсов.
          </div>
          <p className="text-sm leading-relaxed text-text-secondary">
            Рекомендуется временно перевести вуз в статус «Скрыт» вместо
            физического удаления из базы.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function pluralSpecialties(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "специальность";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "специальности";
  }
  return "специальностей";
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
    <div className="overflow-x-auto rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-[#f8fafc] text-xs font-bold uppercase tracking-wide text-text-muted">
          <tr>
            <th className="px-4 py-3">Учебное заведение</th>
            <th className="px-4 py-3">Тип</th>
            <th className="px-4 py-3">Город</th>
            <th className="px-4 py-3">Специальностей</th>
            <th className="px-4 py-3">Статус в каталоге</th>
            <th className="px-4 py-3">Действия</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-text-muted">
                Загрузка…
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-text-muted">
                Нет записей
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-semibold text-brand-900">{item.shortName}</div>
                  <div className="text-xs text-text-muted">{item.fullName}</div>
                </td>
                <td className="px-4 py-3 text-text-primary">{typeLabel(item.type)}</td>
                <td className="px-4 py-3">{item.city || "—"}</td>
                <td className="px-4 py-3">{specialtiesCountOf(item)}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                      item.isPublished
                        ? "bg-[#E4F6EC] text-[#176B45]"
                        : "bg-[#eef2f5] text-text-secondary",
                    )}
                  >
                    {item.isPublished ? "Опубликован" : "Скрыт"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-middle">
                  <div className="inline-flex items-center gap-3">
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
                      onClick={() => onDelete(item)}
                      className="shrink-0 text-xs font-semibold text-[#c0392b] hover:underline"
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
