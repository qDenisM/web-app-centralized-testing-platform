"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Campaign, CampaignStage } from "@/lib/admin";
import { Input } from "@/components/ui/Input";
import { FormButton } from "@/components/ui/FormButton";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

type StageForm = {
  name: string;
  startsOn: string;
  endsOn: string;
};

const emptyStageForm: StageForm = {
  name: "",
  startsOn: "",
  endsOn: "",
};

export function AdminCampaign() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [editingStage, setEditingStage] = useState<CampaignStage | null>(null);
  const [stageForm, setStageForm] = useState<StageForm>(emptyStageForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/campaigns");
      const json = (await res.json().catch(() => ({}))) as Campaign[] & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "Не удалось загрузить кампании");
        return;
      }
      const rows = Array.isArray(json) ? json : [];
      setItems(rows);
      setSelectedCampaignId((prev) => {
        if (prev && rows.some((c) => c.id === prev)) return prev;
        const active = rows.find((c) => c.isActive);
        return active?.id || rows[0]?.id || "";
      });
    } catch {
      setError("Сеть недоступна.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCampaign = useMemo(
    () => items.find((c) => c.id === selectedCampaignId) || null,
    [items, selectedCampaignId],
  );

  const sortedStages = useMemo(() => {
    const stages = selectedCampaign?.stages || [];
    return [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [selectedCampaign]);

  const allStagesRows = useMemo(() => {
    const rows: Array<CampaignStage & { campaignYear: number }> = [];
    for (const campaign of items) {
      for (const stage of campaign.stages || []) {
        rows.push({ ...stage, campaignYear: campaign.year });
      }
    }
    return rows.sort((a, b) =>
      a.startsOn.localeCompare(b.startsOn),
    );
  }, [items]);

  function openAddStageModal() {
    if (!selectedCampaignId) return;
    setEditingStage(null);
    setStageForm(emptyStageForm);
    setStageModalOpen(true);
  }

  function openEditStageModal(stage: CampaignStage) {
    setEditingStage(stage);
    setSelectedCampaignId(stage.campaignId);
    setStageForm({
      name: stage.name,
      startsOn: stage.startsOn.slice(0, 10),
      endsOn: stage.endsOn.slice(0, 10),
    });
    setStageModalOpen(true);
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: Number(year), isActive: false }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(json.error || "Не удалось создать кампанию");
      return;
    }
    await load();
  }

  async function setActive(campaign: Campaign) {
    const res = await fetch(`/api/admin/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error || "Не удалось активировать");
      return;
    }
    await load();
  }

  async function saveStage() {
    if (!selectedCampaignId) return;
    setBusy(true);
    try {
      if (editingStage) {
        const res = await fetch(
          `/api/admin/campaign-stages/${editingStage.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: stageForm.name,
              startsOn: stageForm.startsOn,
              endsOn: stageForm.endsOn,
            }),
          },
        );
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(json.error || "Не удалось сохранить этап");
          return;
        }
      } else {
        const campaign = items.find((c) => c.id === selectedCampaignId);
        const stages = campaign?.stages || [];
        const maxOrder = stages.reduce(
          (max, s) => Math.max(max, s.sortOrder),
          0,
        );
        const res = await fetch(
          `/api/admin/campaigns/${selectedCampaignId}/stages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sortOrder: maxOrder + 1,
              name: stageForm.name,
              startsOn: stageForm.startsOn,
              endsOn: stageForm.endsOn,
            }),
          },
        );
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(json.error || "Не удалось добавить этап");
          return;
        }
      }
      setStageForm(emptyStageForm);
      setEditingStage(null);
      setStageModalOpen(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removeStage(stageId: string) {
    const res = await fetch(`/api/admin/campaign-stages/${stageId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error || "Не удалось удалить этап");
      return;
    }
    await load();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("ru-RU");
  }

  const today = Date.now();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Приёмная кампания
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Год приёмной кампании, этапы и календарь на текущий сезон.
        </p>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(e) => void createCampaign(e)}
        className="flex flex-wrap items-end gap-3 rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]"
      >
        <Input
          label="Год кампании"
          name="year"
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
        <FormButton type="submit" className="w-auto">
          Создать кампанию
        </FormButton>
      </form>

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-muted">Кампании ещё не созданы.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
            <label className="block space-y-1.5 text-sm">
              <span className="font-semibold text-text-secondary">Кампания</span>
              <select
                className="rounded-[10px] border border-border bg-white px-3 py-2"
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
              >
                {items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.year}
                    {c.isActive ? " · активная" : ""}
                  </option>
                ))}
              </select>
            </label>
            {selectedCampaign && !selectedCampaign.isActive ? (
              <FormButton
                type="button"
                className="w-auto px-4 py-2.5"
                onClick={() => void setActive(selectedCampaign)}
              >
                Сделать активной
              </FormButton>
            ) : null}
            <FormButton
              type="button"
              className="w-auto px-4 py-2.5"
              disabled={!selectedCampaignId}
              onClick={openAddStageModal}
            >
              + Этап кампании
            </FormButton>
          </div>

          {selectedCampaign ? (
            <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
              <h2 className="text-sm font-bold uppercase tracking-wide text-text-muted">
                Лента этапов · {selectedCampaign.year}
              </h2>
              {sortedStages.length === 0 ? (
                <p className="mt-4 text-sm text-text-muted">
                  Этапы не заданы. Добавьте первый этап кампании.
                </p>
              ) : (
                <ol className="relative mt-6 space-y-0 border-l-2 border-brand-200 pl-6">
                  {sortedStages.map((stage, index) => {
                    const start = new Date(stage.startsOn).getTime();
                    const end =
                      new Date(stage.endsOn).getTime() + 86400000 - 1;
                    const active = today >= start && today <= end;
                    return (
                      <li key={stage.id} className="relative pb-6 last:pb-0">
                        <span
                          className={cn(
                            "absolute -left-[1.55rem] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white text-[9px] font-black",
                            active ? "bg-brand-700 text-white" : "bg-border",
                          )}
                        >
                          {index + 1}
                        </span>
                        <div
                          className={cn(
                            "rounded-[10px] border px-4 py-3",
                            active
                              ? "border-brand-200 bg-brand-50"
                              : "border-border bg-[#f8fafc]",
                          )}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-brand-900">
                                {stage.name}
                              </div>
                              <div className="mt-0.5 text-xs text-text-muted">
                                {formatDate(stage.startsOn)} —{" "}
                                {formatDate(stage.endsOn)}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEditStageModal(stage)}
                                className="text-xs font-semibold text-brand-700 hover:underline"
                              >
                                Изменить
                              </button>
                              <button
                                type="button"
                                onClick={() => void removeStage(stage.id)}
                                className="text-xs font-semibold text-red-600 hover:underline"
                              >
                                Удалить
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          ) : null}

          <section className="overflow-x-auto rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-[#f8fafc] text-xs font-bold uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-4 py-3">Год</th>
                  <th className="px-4 py-3">№</th>
                  <th className="px-4 py-3">Этап</th>
                  <th className="px-4 py-3">Начало</th>
                  <th className="px-4 py-3">Окончание</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {allStagesRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-text-muted">
                      Этапы не заданы
                    </td>
                  </tr>
                ) : (
                  allStagesRows.map((stage) => (
                    <tr key={stage.id} className="border-b border-border">
                      <td className="px-4 py-3">{stage.campaignYear}</td>
                      <td className="px-4 py-3">{stage.sortOrder}</td>
                      <td className="px-4 py-3 font-semibold text-brand-900">
                        {stage.name}
                      </td>
                      <td className="px-4 py-3">{formatDate(stage.startsOn)}</td>
                      <td className="px-4 py-3">{formatDate(stage.endsOn)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditStageModal(stage)}
                          className="text-xs font-semibold text-brand-700 hover:underline"
                        >
                          Изменить
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </>
      )}

      <Modal
        open={stageModalOpen}
        onClose={() => {
          setStageModalOpen(false);
          setEditingStage(null);
          setStageForm(emptyStageForm);
        }}
        title="Этап приёмной кампании"
        footer={
          <>
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto px-4 py-2.5"
              onClick={() => {
                setStageModalOpen(false);
                setEditingStage(null);
                setStageForm(emptyStageForm);
              }}
              disabled={busy}
            >
              Отмена
            </FormButton>
            <FormButton
              type="button"
              className="w-auto px-4 py-2.5"
              disabled={
                busy ||
                !stageForm.name.trim() ||
                !stageForm.startsOn ||
                !stageForm.endsOn
              }
              onClick={() => void saveStage()}
            >
              Сохранить
            </FormButton>
          </>
        }
      >
        <div className="grid gap-3">
          <Input
            label="Название этапа"
            name="stageName"
            value={stageForm.name}
            onChange={(e) =>
              setStageForm((prev) => ({ ...prev, name: e.target.value }))
            }
            required
          />
          <Input
            label="Начало"
            name="startsOn"
            type="date"
            value={stageForm.startsOn}
            onChange={(e) =>
              setStageForm((prev) => ({ ...prev, startsOn: e.target.value }))
            }
            required
          />
          <Input
            label="Окончание"
            name="endsOn"
            type="date"
            value={stageForm.endsOn}
            onChange={(e) =>
              setStageForm((prev) => ({ ...prev, endsOn: e.target.value }))
            }
            required
          />
        </div>
      </Modal>
    </div>
  );
}