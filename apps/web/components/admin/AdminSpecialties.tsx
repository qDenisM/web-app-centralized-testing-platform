"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Campaign, Institution, Specialty, Subject } from "@/lib/admin";
import { Input } from "@/components/ui/Input";
import { FormButton } from "@/components/ui/FormButton";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";

const CURRENT_YEAR = new Date().getFullYear();

const STUDY_FORMS = [
  { value: "fulltime", label: "Очная" },
  { value: "parttime", label: "Заочная" },
  { value: "distance", label: "Дистанционная" },
] as const;

const FUNDINGS = [
  { value: "budget", label: "Бюджет" },
  { value: "paid", label: "Платное" },
] as const;

const CONTENT_MODES = [
  {
    value: "ct",
    label: "ЦТ + Аттестат (Университет, шкала 400)",
  },
  {
    value: "attestat",
    label: "Аттестат (средний балл)",
  },
] as const;

const LANGUAGE_CODES = new Set(["РУС", "БЕЛ", "RUS", "BEL"]);

type SubjectSlotDraft = {
  subjectId: string;
  minScore: string;
};

type SpecialtyForm = {
  institutionId: string;
  okrbCode: string;
  name: string;
  studyForm: string;
  funding: string;
  placesPlan: number;
  contentMode: string;
  isPublished: boolean;
  slots: [SubjectSlotDraft, SubjectSlotDraft, SubjectSlotDraft];
};

const emptySlots = (): SpecialtyForm["slots"] => [
  { subjectId: "", minScore: "20" },
  { subjectId: "", minScore: "10" },
  { subjectId: "", minScore: "10" },
];

const defaultForm = (): SpecialtyForm => ({
  institutionId: "",
  okrbCode: "",
  name: "",
  studyForm: "fulltime",
  funding: "budget",
  placesPlan: 30,
  contentMode: "ct",
  isPublished: true,
  slots: emptySlots(),
});

function studyFormLabel(value: string): string {
  return STUDY_FORMS.find((f) => f.value === value)?.label ?? value;
}

function fundingLabel(value: string): string {
  return FUNDINGS.find((f) => f.value === value)?.label ?? value;
}

function contentModeLabel(value: string): string {
  return CONTENT_MODES.find((m) => m.value === value)?.label ?? value;
}

function scoreForYear(item: Specialty, year: number): number | null {
  const hit = (item.passingScores || []).find((ps) => ps.year === year);
  return hit ? hit.score : null;
}

function parseDay(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Campaign year is finished when every stage has ended (or year is in the past with no stages). */
function isCampaignYearFinished(campaign: Campaign | null, today: Date): boolean {
  if (!campaign) return false;
  const stages = campaign.stages || [];
  if (stages.length === 0) {
    return campaign.year < today.getFullYear();
  }
  const lastEnd = Math.max(
    ...stages.map((s) => parseDay(s.endsOn).getTime()),
  );
  if (Number.isNaN(lastEnd)) return false;
  return today.getTime() > lastEnd;
}

function scoreColumnYearFromCampaigns(campaigns: Campaign[]): number {
  const active = campaigns.find((c) => c.isActive);
  if (active) return active.year;
  if (campaigns.length === 0) return CURRENT_YEAR;
  return Math.max(...campaigns.map((c) => c.year));
}

function subjectsCell(item: Specialty): string {
  if (item.contentMode === "attestat") {
    return "Аттестат (средний балл)";
  }
  const codes = [...(item.subjects || [])]
    .sort((a, b) => a.slot - b.slot)
    .map((s) => s.subject?.shortCode)
    .filter(Boolean);
  return codes.length > 0 ? codes.join(", ") : "—";
}

function slotsFromSpecialty(item: Specialty): SpecialtyForm["slots"] {
  const next = emptySlots();
  for (const row of item.subjects || []) {
    const idx = row.slot - 1;
    if (idx < 0 || idx > 2) continue;
    next[idx] = {
      subjectId: row.subjectId,
      minScore: String(row.minScore),
    };
  }
  return next;
}

function recordsLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} запись в текущей выборке`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${n} записи в текущей выборке`;
  }
  return `${n} записей в текущей выборке`;
}

export function AdminSpecialties() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [items, setItems] = useState<Specialty[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState<SpecialtyForm>(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [specModalOpen, setSpecModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Specialty | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Specialty | null>(null);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [filterInstitutionId, setFilterInstitutionId] = useState("");
  const [filterStudyForm, setFilterStudyForm] = useState("");
  const [filterFunding, setFilterFunding] = useState("");

  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const [scoreYear, setScoreYear] = useState(String(CURRENT_YEAR));
  const [scoreValue, setScoreValue] = useState("");
  const [modalScores, setModalScores] = useState<Specialty["passingScores"]>([]);

  const loadInstitutions = useCallback(async () => {
    const res = await fetch("/api/admin/institutions");
    const json = (await res.json().catch(() => [])) as Institution[];
    if (res.ok && Array.isArray(json)) setInstitutions(json);
  }, []);

  const loadSubjects = useCallback(async () => {
    const res = await fetch("/api/admin/subjects");
    const json = (await res.json().catch(() => [])) as Subject[];
    if (res.ok && Array.isArray(json)) setSubjects(json);
  }, []);

  const loadSpecialties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/specialties");
      const json = (await res.json().catch(() => ({}))) as Specialty[] & {
        error?: string;
      };
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
  }, []);

  const loadCampaigns = useCallback(async () => {
    const res = await fetch("/api/admin/campaigns");
    const json = (await res.json().catch(() => [])) as Campaign[];
    if (res.ok && Array.isArray(json)) setCampaigns(json);
  }, []);

  useEffect(() => {
    void loadInstitutions();
    void loadSubjects();
    void loadSpecialties();
    void loadCampaigns();
  }, [loadInstitutions, loadSubjects, loadSpecialties, loadCampaigns]);

  const scoreColumnYear = useMemo(
    () => scoreColumnYearFromCampaigns(campaigns),
    [campaigns],
  );

  const scoreColumnCampaign = useMemo(
    () => campaigns.find((c) => c.year === scoreColumnYear) || null,
    [campaigns, scoreColumnYear],
  );

  const scoreColumnReady = useMemo(
    () => isCampaignYearFinished(scoreColumnCampaign, today),
    [scoreColumnCampaign, today],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filterInstitutionId && item.institutionId !== filterInstitutionId) {
        return false;
      }
      if (filterStudyForm && item.studyForm !== filterStudyForm) return false;
      if (filterFunding && item.funding !== filterFunding) return false;
      if (q) {
        const hay = `${item.name} ${item.okrbCode}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, filterInstitutionId, filterStudyForm, filterFunding]);

  const profileSubjects = useMemo(
    () => subjects.filter((s) => !LANGUAGE_CODES.has(s.shortCode.toUpperCase())),
    [subjects],
  );
  const languageSubjects = useMemo(
    () => subjects.filter((s) => LANGUAGE_CODES.has(s.shortCode.toUpperCase())),
    [subjects],
  );

  function openCreateSpec() {
    setEditingSpec(null);
    setForm({
      ...defaultForm(),
      institutionId: filterInstitutionId || institutions[0]?.id || "",
    });
    setModalScores([]);
    setScoreYear(String(CURRENT_YEAR));
    setScoreValue("");
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
      slots: slotsFromSpecialty(item),
    });
    setModalScores([...(item.passingScores || [])].sort((a, b) => b.year - a.year));
    setScoreYear(String(CURRENT_YEAR));
    setScoreValue("");
    setSpecModalOpen(true);
  }

  function updateSlot(index: 0 | 1 | 2, patch: Partial<SubjectSlotDraft>) {
    setForm((f) => {
      const slots = [...f.slots] as SpecialtyForm["slots"];
      slots[index] = { ...slots[index], ...patch };
      return { ...f, slots };
    });
  }

  async function syncSubjects(specialtyId: string) {
    if (form.contentMode === "attestat") {
      const res = await fetch(`/api/admin/specialties/${specialtyId}/subjects`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjects: [] }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error || "Не удалось обновить предметы");
      }
      return;
    }

    const [s1, s2, s3] = form.slots;
    if (!s1.subjectId || !s2.subjectId || !s3.subjectId) {
      throw new Error("Выберите все 3 предмета ЦТ");
    }
    if (s1.subjectId === s2.subjectId) {
      throw new Error("Профильные предметы не должны совпадать");
    }
    const lang = subjects.find((s) => s.id === s3.subjectId);
    if (!lang || !LANGUAGE_CODES.has(lang.shortCode.toUpperCase())) {
      throw new Error("Гос. язык — РУС или БЕЛ");
    }

    const res = await fetch(`/api/admin/specialties/${specialtyId}/subjects`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjects: form.slots.map((slot, i) => ({
          subjectId: slot.subjectId,
          slot: i + 1,
          minScore: Number(slot.minScore) || 0,
        })),
      }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(json.error || "Не удалось сохранить предметы");
    }
  }

  async function saveSpecialty() {
    if (!form.institutionId || !form.okrbCode.trim() || !form.name.trim()) {
      setError("Заполните учебное заведение, код ОКРБ и наименование");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        institutionId: form.institutionId,
        okrbCode: form.okrbCode.trim(),
        name: form.name.trim(),
        studyForm: form.studyForm,
        funding: form.funding,
        placesPlan: Number(form.placesPlan) || 0,
        contentMode: form.contentMode,
        isPublished: form.isPublished,
      };

      const res = editingSpec
        ? await fetch(`/api/admin/specialties/${editingSpec.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/specialties", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const json = (await res.json().catch(() => ({}))) as Specialty & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "Не удалось сохранить специальность");
        return;
      }

      const specialtyId = json.id || editingSpec?.id;
      if (!specialtyId) {
        setError("Не удалось определить id специальности");
        return;
      }

      await syncSubjects(specialtyId);

      const year = Number(scoreYear);
      const score = Number(scoreValue);
      if (scoreYear && scoreValue && Number.isFinite(year) && Number.isFinite(score)) {
        const scoreRes = await fetch(
          `/api/admin/specialties/${specialtyId}/passing-scores`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year, score }),
          },
        );
        if (!scoreRes.ok) {
          const scoreJson = (await scoreRes.json().catch(() => ({}))) as {
            error?: string;
          };
          setError(
            scoreJson.error ||
              "Специальность сохранена, но проходной балл не добавлен",
          );
          await loadSpecialties();
          setSpecModalOpen(false);
          return;
        }
      }

      setSpecModalOpen(false);
      setForm(defaultForm());
      await loadSpecialties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  async function removeScore(scoreId: string) {
    if (!editingSpec) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/specialties/${editingSpec.id}/passing-scores/${scoreId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error || "Не удалось удалить балл");
        return;
      }
      setModalScores((prev) => (prev || []).filter((s) => s.id !== scoreId));
      await loadSpecialties();
    } finally {
      setBusy(false);
    }
  }

  async function hideSpecialty() {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/specialties/${deleteTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: false }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error || "Не удалось скрыть специальность");
        return;
      }
      setDeleteTarget(null);
      await loadSpecialties();
    } finally {
      setBusy(false);
    }
  }

  async function hardDeleteSpecialty() {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/specialties/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error || "Не удалось удалить специальность");
        return;
      }
      setDeleteTarget(null);
      if (editingSpec?.id === deleteTarget.id) {
        setSpecModalOpen(false);
        setEditingSpec(null);
      }
      await loadSpecialties();
    } finally {
      setBusy(false);
    }
  }

  const deleteScoreCount = deleteTarget?.passingScores?.length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Специальности
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Управление кодами ОКРБ, планами набора, проходными баллами и предметами
            ЦТ
          </p>
        </div>
        <FormButton
          type="button"
          className="w-auto px-4 py-2.5"
          onClick={openCreateSpec}
        >
          + Добавить специальность
        </FormButton>
      </div>

      {error ? (
        <Alert>{error}</Alert>
      ) : null}

      <section className="rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className="space-y-3">
          <label className="relative block w-full">
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
              placeholder="Код или название (ПОИТ, Инженерия...)"
              className="w-full rounded-[10px] border border-border bg-white py-2.5 pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect
              value={filterInstitutionId}
              onChange={(e) => setFilterInstitutionId(e.target.value)}
              className="min-w-[180px]"
            >
              <option value="">Все вузы и колледжи</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.shortName}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={filterStudyForm}
              onChange={(e) => setFilterStudyForm(e.target.value)}
              className="min-w-[140px]"
            >
              <option value="">Любая форма</option>
              {STUDY_FORMS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={filterFunding}
              onChange={(e) => setFilterFunding(e.target.value)}
              className="min-w-[160px]"
            >
              <option value="">Бюджет и платное</option>
              {FUNDINGS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </FilterSelect>

            <p className="ml-auto text-sm text-text-muted">
              {recordsLabel(filtered.length)}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-[#f8fafc] text-xs font-bold uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-3">Специальность (ОКРБ)</th>
                <th className="px-4 py-3">Учреждение</th>
                <th className="px-4 py-3">Форма / Основа</th>
                <th className="px-4 py-3">Предметы ЦТ / Условия</th>
                <th className="px-4 py-3">Проходной {scoreColumnYear}</th>
                <th className="px-4 py-3">Мест (план)</th>
                <th className="px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-text-muted">
                    Загрузка…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-text-muted">
                    Нет записей
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const score = scoreColumnReady
                    ? scoreForYear(item, scoreColumnYear)
                    : null;
                  return (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="font-bold text-text-primary">{item.name}</div>
                        <div className="text-xs text-text-muted">{item.okrbCode}</div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {item.institution?.shortName || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-text-primary">
                          {studyFormLabel(item.studyForm)}
                        </div>
                        <div className="text-xs text-text-muted">
                          {fundingLabel(item.funding)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {subjectsCell(item)}
                      </td>
                      <td className="px-4 py-3 text-base font-extrabold text-text-primary">
                        {score != null ? score : "—"}
                      </td>
                      <td className="px-4 py-3 text-text-primary">{item.placesPlan}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right align-middle">
                        <div className="inline-flex items-center justify-end gap-3">
                          <FormButton
                            type="button"
                            variant="secondary"
                            className="w-auto shrink-0 px-3 py-1.5 text-xs"
                            onClick={() => openEditSpec(item)}
                          >
                            Изменить
                          </FormButton>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
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
      </section>

      <Modal
        open={specModalOpen}
        onClose={() => setSpecModalOpen(false)}
        title="Параметры специальности"
        subtitle="Редактирование условий конкурса и проходных баллов"
        size="xl"
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
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-text-muted">
              1. Основные сведения
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold text-text-secondary">
                  Учебное заведение
                </span>
                <FilterSelect
                  value={form.institutionId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, institutionId: e.target.value }))
                  }
                >
                  <option value="">—</option>
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.shortName}
                    </option>
                  ))}
                </FilterSelect>
              </label>
              <Input
                label="Код ОКРБ"
                name="okrbCode"
                value={form.okrbCode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, okrbCode: e.target.value }))
                }
                required
              />
            </div>
            <Input
              label="Наименование специальности"
              name="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold text-text-secondary">Форма</span>
                <FilterSelect
                  value={form.studyForm}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, studyForm: e.target.value }))
                  }
                >
                  {STUDY_FORMS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </FilterSelect>
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold text-text-secondary">Основа</span>
                <FilterSelect
                  value={form.funding}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, funding: e.target.value }))
                  }
                >
                  {FUNDINGS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </FilterSelect>
              </label>
              <Input
                label="Количество мест"
                name="placesPlan"
                type="number"
                min={0}
                value={form.placesPlan}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    placesPlan: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isPublished: e.target.checked }))
                }
              />
              Опубликована
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-text-muted">
              2. Условия конкурса и предметы ЦТ
            </h3>
            <label className="block space-y-1.5 text-sm">
              <span className="font-semibold text-text-secondary">
                Способ конкурса
              </span>
              <FilterSelect
                value={form.contentMode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contentMode: e.target.value }))
                }
              >
                {CONTENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </FilterSelect>
            </label>

            {form.contentMode === "ct" ? (
              <>
                <p className="text-sm text-text-muted">
                  3 предмета ЦТ — выбор из справочника «Предметы ЦТ»
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      {
                        index: 0 as const,
                        title: "1-й профильный",
                        options: profileSubjects,
                      },
                      {
                        index: 1 as const,
                        title: "2-й профильный",
                        options: profileSubjects,
                      },
                      {
                        index: 2 as const,
                        title: "Гос. язык",
                        options: languageSubjects,
                      },
                    ] as const
                  ).map((card) => (
                    <div
                      key={card.title}
                      className="space-y-2 rounded-[12px] border border-border bg-[#f8fafc] p-3"
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                        {card.title}
                      </p>
                      <FilterSelect
                        value={form.slots[card.index].subjectId}
                        onChange={(e) =>
                          updateSlot(card.index, { subjectId: e.target.value })
                        }
                      >
                        <option value="">—</option>
                        {card.options.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.shortCode})
                          </option>
                        ))}
                      </FilterSelect>
                      <Input
                        label="Порог"
                        name={`minScore-${card.index}`}
                        type="number"
                        min={0}
                        value={form.slots[card.index].minScore}
                        onChange={(e) =>
                          updateSlot(card.index, { minScore: e.target.value })
                        }
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-text-muted">
                  Профильные предметы не должны совпадать. Гос. язык — РУС или БЕЛ.
                </p>
              </>
            ) : (
              <p className="rounded-[10px] border border-border bg-[#f8fafc] px-3 py-2 text-sm text-text-secondary">
                Для способа «{contentModeLabel(form.contentMode)}» предметы ЦТ не
                задаются.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-text-muted">
              3. Проходные баллы
            </h3>
            {editingSpec && (modalScores || []).length > 0 ? (
              <ul className="space-y-1.5 text-sm">
                {(modalScores || []).map((ps) => (
                  <li
                    key={ps.id}
                    className="flex items-center justify-between gap-2 rounded-[10px] border border-border px-3 py-2"
                  >
                    <span>
                      <span className="font-semibold text-text-primary">{ps.year}</span>
                      <span className="text-text-muted"> · </span>
                      <span className="font-extrabold text-text-primary">{ps.score}</span>
                    </span>
                    <button
                      type="button"
                      className={cn(
                        "text-xs font-semibold text-red-600 hover:text-red-700",
                        busy && "opacity-50",
                      )}
                      disabled={busy}
                      onClick={() => void removeScore(ps.id)}
                    >
                      Удалить
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">
                {editingSpec
                  ? "Пока нет проходных баллов"
                  : "После создания можно сразу добавить балл ниже"}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Год"
                name="scoreYear"
                type="number"
                value={scoreYear}
                onChange={(e) => setScoreYear(e.target.value)}
              />
              <Input
                label="Проходной балл"
                name="scoreValue"
                type="number"
                value={scoreValue}
                onChange={(e) => setScoreValue(e.target.value)}
                placeholder="например 332"
              />
            </div>
            <p className="text-xs text-text-muted">
              Балл сохранится вместе со специальностью, если оба поля заполнены.
            </p>
          </section>
        </div>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Удаление специальности"
        subtitle="Проверка связанных проходных баллов"
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
              onClick={() => void hideSpecialty()}
            >
              Скрыть из каталога
            </FormButton>
            <FormButton
              type="button"
              variant="destructive"
              className="w-auto px-4 py-2.5"
              disabled={busy}
              onClick={() => void hardDeleteSpecialty()}
            >
              Всё равно удалить
            </FormButton>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-[12px] border border-[#E6C65C] bg-[#FFF8DF] px-4 py-3 text-sm font-medium leading-relaxed text-[#8A6A00]">
            Внимание: У специальности «{deleteTarget?.name}» зарегистрировано{" "}
            {deleteScoreCount} {pluralScores(deleteScoreCount)}. Полное удаление
            приведет к потере исторических конкурсов.
          </div>
          <p className="text-sm leading-relaxed text-text-secondary">
            Рекомендуется временно перевести специальность в статус «Скрыта»
            вместо физического удаления из базы.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function pluralScores(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "проходной балл";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "проходных балла";
  }
  return "проходных баллов";
}
