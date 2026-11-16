"use client";

import { useCallback, useEffect, useState } from "react";
import type { Institution, Specialty } from "@/lib/admin";
import { Input } from "@/components/ui/Input";
import { FormButton } from "@/components/ui/FormButton";
import { Modal } from "@/components/ui/Modal";

const defaultForm = {
  institutionId: "",
  okrbCode: "",
  name: "",
  studyForm: "очная",
  funding: "бюджет",
  placesPlan: 30,
  contentMode: "full",
  isPublished: false,
};

export function AdminSpecialties() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [filterInstitutionId, setFilterInstitutionId] = useState("");
  const [items, setItems] = useState<Specialty[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [scoreYear, setScoreYear] = useState(String(new Date().getFullYear()));
  const [scoreValue, setScoreValue] = useState("7");
  const [scoreSpecialtyId, setScoreSpecialtyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [specModalOpen, setSpecModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Specialty | null>(null);
  const [busy, setBusy] = useState(false);

  const loadInstitutions = useCallback(async () => {
    const res = await fetch("/api/admin/institutions");
    const json = (await res.json().catch(() => [])) as Institution[];
    if (res.ok && Array.isArray(json)) {
      setInstitutions(json);
      if (json[0]) {
        setFilterInstitutionId((prev) => prev || json[0].id);
      }
    }
  }, []);

  const loadSpecialties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const suffix = filterInstitutionId
        ? `?institutionId=${encodeURIComponent(filterInstitutionId)}`
        : "";
      const res = await fetch(`/api/admin/specialties${suffix}`);
      const json = (await res.json().catch(() => ({}))) as Specialty[] & { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось загрузить специальности");
        return;
      }
      setItems(Array.isArray(json) ? json : []);
    } catch {
      setError("Сеть недоступна.");
    } finally {
      setLoading(false);
    }
  }, [filterInstitutionId]);

  useEffect(() => {
    void loadInstitutions();
  }, [loadInstitutions]);

  useEffect(() => {
    if (filterInstitutionId) {
      setForm((f) => ({ ...f, institutionId: filterInstitutionId }));
    }
  }, [filterInstitutionId]);

  useEffect(() => {
    void loadSpecialties();
  }, [loadSpecialties]);

  function openCreateSpec() {
    setEditingSpec(null);
    setForm((f) => ({ ...defaultForm, institutionId: f.institutionId }));
    setSpecModalOpen(true);
  }

  function openEditSpec(item: Specialty) {
    setEditingSpec(item);
    setForm({
      institutionId: item.institutionId,
      okrbCode: item.okrbCode,
      name: item.name,
      studyForm: item.studyForm,
      funding: item.funding,
      placesPlan: item.placesPlan,
      contentMode: item.contentMode,
      isPublished: item.isPublished,
    });
    setSpecModalOpen(true);
  }

  async function saveSpecialty() {
    setBusy(true);
    try {
    const res = editingSpec
      ? await fetch(`/api/admin/specialties/${editingSpec.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      : await fetch("/api/admin/specialties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(json.error || "Не удалось сохранить специальность");
      return;
    }
    setSpecModalOpen(false);
    setForm((f) => ({ ...defaultForm, institutionId: f.institutionId }));
    await loadSpecialties();
    } finally {
      setBusy(false);
    }
  }

  async function addPassingScore(e: React.FormEvent) {
    e.preventDefault();
    if (!scoreSpecialtyId) {
      setError("Выберите специальность");
      return;
    }
    const res = await fetch(`/api/admin/specialties/${scoreSpecialtyId}/passing-scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: Number(scoreYear),
        score: Number(scoreValue),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(json.error || "Не удалось добавить проходной балл");
      return;
    }
    await loadSpecialties();
  }

  async function removeScore(specialtyId: string, scoreId: string) {
    const res = await fetch(
      `/api/admin/specialties/${specialtyId}/passing-scores/${scoreId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error || "Не удалось удалить балл");
      return;
    }
    await loadSpecialties();
  }

  async function togglePublished(item: Specialty) {
    const res = await fetch(`/api/admin/specialties/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !item.isPublished }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error || "Не удалось обновить");
      return;
    }
    await loadSpecialties();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Специальности
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Программы вузов и проходные баллы.
        </p>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="block space-y-1.5 text-sm">
          <span className="font-semibold text-text-secondary">Вуз</span>
          <select
            className="rounded-[10px] border border-border bg-white px-3 py-2"
            value={filterInstitutionId}
            onChange={(e) => setFilterInstitutionId(e.target.value)}
          >
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.shortName}
              </option>
            ))}
          </select>
        </label>
        <FormButton type="button" className="w-auto px-4 py-2.5" onClick={openCreateSpec}>
          + Специальность
        </FormButton>
      </div>

      <Modal
        open={specModalOpen}
        onClose={() => setSpecModalOpen(false)}
        title="Параметры специальности"
        footer={
          <>
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto px-4 py-2.5"
              onClick={() => setSpecModalOpen(false)}
              disabled={busy}
            >
              Отмена
            </FormButton>
            <FormButton
              type="button"
              className="w-auto px-4 py-2.5"
              disabled={busy}
              onClick={() => void saveSpecialty()}
            >
              Сохранить
            </FormButton>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Код ОКРБ"
            name="okrbCode"
            value={form.okrbCode}
            onChange={(e) => setForm((f) => ({ ...f, okrbCode: e.target.value }))}
            required
          />
          <Input
            label="Название"
            name="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="Места"
            name="placesPlan"
            type="number"
            value={form.placesPlan}
            onChange={(e) =>
              setForm((f) => ({ ...f, placesPlan: Number(e.target.value) || 0 }))
            }
          />
          <label className="flex items-center gap-2 text-sm font-semibold text-text-secondary sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
            />
            Опубликована
          </label>
        </div>
      </Modal>

      <form
        onSubmit={(e) => void addPassingScore(e)}
        className="grid gap-3 rounded-[14px] border border-border bg-white p-5 sm:grid-cols-4"
      >
        <label className="block space-y-1.5 text-sm sm:col-span-2">
          <span className="font-semibold text-text-secondary">Специальность</span>
          <select
            className="w-full rounded-[10px] border border-border px-3 py-2"
            value={scoreSpecialtyId}
            onChange={(e) => setScoreSpecialtyId(e.target.value)}
          >
            <option value="">—</option>
            {items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Год"
          name="scoreYear"
          type="number"
          value={scoreYear}
          onChange={(e) => setScoreYear(e.target.value)}
        />
        <Input
          label="Мин. балл"
          name="scoreValue"
          type="number"
          value={scoreValue}
          onChange={(e) => setScoreValue(e.target.value)}
        />
        <FormButton type="submit" className="sm:col-span-4 sm:w-auto">
          Добавить проходной балл
        </FormButton>
      </form>

      <SpecialtyTable
        loading={loading}
        items={items}
        onToggle={togglePublished}
        onRemoveScore={removeScore}
        onEdit={openEditSpec}
      />
    </div>
  );
}

function SpecialtyTable({
  loading,
  items,
  onToggle,
  onRemoveScore,
  onEdit,
}: {
  loading: boolean;
  items: Specialty[];
  onToggle: (item: Specialty) => Promise<void>;
  onRemoveScore: (specialtyId: string, scoreId: string) => Promise<void>;
  onEdit: (item: Specialty) => void;
}) {
  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-muted">Нет записей</p>
      ) : (
        items.map((item) => (
          <article
            key={item.id}
            className="rounded-[14px] border border-border bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-text-primary">{item.name}</h3>
                <p className="text-xs text-text-muted">
                  {item.okrbCode} · мест: {item.placesPlan}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="text-sm font-semibold text-brand-700"
                >
                  Изменить
                </button>
                <button
                  type="button"
                  onClick={() => void onToggle(item)}
                  className="text-sm font-semibold text-text-secondary"
                >
                  {item.isPublished ? "Опубликована" : "Скрыта"}
                </button>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs font-bold uppercase text-text-muted">Проходные баллы</p>
              <ul className="mt-1 space-y-1 text-sm">
                {(item.passingScores || []).length === 0 ? (
                  <li className="text-text-muted">Нет данных</li>
                ) : (
                  (item.passingScores || []).map((ps) => (
                    <li key={ps.id} className="flex items-center justify-between gap-2">
                      <span>
                        {ps.year}: {ps.score}
                      </span>
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-600"
                        onClick={() => void onRemoveScore(item.id, ps.id)}
                      >
                        Удалить
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </article>
        ))
      )}
    </div>
  );
}