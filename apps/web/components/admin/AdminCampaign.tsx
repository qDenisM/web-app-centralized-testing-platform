"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Campaign,
  CampaignStage,
  StageStatusOverride,
} from "@/lib/admin";
import { Input } from "@/components/ui/Input";
import { FormButton } from "@/components/ui/FormButton";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { notifyCampaignChanged } from "@/lib/campaign-events";

type StageForm = {
  name: string;
  description: string;
  startsOn: string;
  endsOn: string;
  /** "" = auto from dates */
  statusOverride: "" | StageStatusOverride;
};

type StagePhase = "done" | "active" | "upcoming";

const emptyStageForm: StageForm = {
  name: "",
  description: "",
  startsOn: "",
  endsOn: "",
  statusOverride: "",
};

function parseDay(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDate(iso: string): string {
  const d = parseDay(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU");
}

function formatDateShortRange(startIso: string, endIso: string): string {
  const a = parseDay(startIso);
  const b = parseDay(endIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "—";
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${fmt(a)} – ${fmt(b)}`;
}

function stagePhaseFromDates(stage: CampaignStage, today: Date): StagePhase {
  const start = parseDay(stage.startsOn).getTime();
  const end = parseDay(stage.endsOn).getTime();
  const t = today.getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return "upcoming";
  if (t > end) return "done";
  if (t < start) return "upcoming";
  return "active";
}

function stagePhase(stage: CampaignStage, today: Date): StagePhase {
  if (
    stage.statusOverride === "done" ||
    stage.statusOverride === "active" ||
    stage.statusOverride === "upcoming"
  ) {
    return stage.statusOverride;
  }
  return stagePhaseFromDates(stage, today);
}

function phaseLabel(phase: StagePhase): string {
  if (phase === "done") return "Завершён";
  if (phase === "active") return "Идёт сейчас";
  return "Впереди";
}

function phaseBadgeClass(phase: StagePhase): string {
  if (phase === "done") return "bg-[#E4F6EC] text-[#176B45]";
  if (phase === "active") return "bg-[#E7F0F8] text-[#2F6FAE]";
  return "bg-[#eef1f4] text-text-secondary";
}

function notificationLabel(phase: StagePhase): string {
  if (phase === "done") return "Отправлено (SMS/Push)";
  if (phase === "active") return "Активно (напоминания)";
  return "Запланировано";
}

function stageHint(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("регистрац") || n.includes("подач")) {
    return "Подача заявлений через личный кабинет и оплата через ЕРИП.";
  }
  if (n.includes("цт") || n.includes("цэ") || n.includes("тест") || n.includes("проведен")) {
    return "Сдача предметов ЦТ на пунктах тестирования вузов РБ.";
  }
  if (n.includes("результат") || n.includes("сертификат") || n.includes("балл")) {
    return "Проверка бланков РИКЗ и загрузка баллов в систему.";
  }
  if (n.includes("аттестат") || n.includes("документ") || n.includes("зачислен")) {
    return "Подача оригиналов аттестатов и дипломов очно.";
  }
  return "Этап приёмной кампании текущего сезона.";
}

function stageDescription(stage: CampaignStage): string {
  // null/undefined = auto hint by name; "" = intentionally cleared
  if (stage.description == null) return stageHint(stage.name);
  return stage.description.trim();
}

export function AdminCampaign() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [editingStage, setEditingStage] = useState<CampaignStage | null>(null);
  const [stageForm, setStageForm] = useState<StageForm>(emptyStageForm);

  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

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

  function openAddStageModal() {
    if (!selectedCampaignId) return;
    setEditingStage(null);
    setStageForm({
      ...emptyStageForm,
      description: stageHint(""),
    });
    setModalError(null);
    setStageModalOpen(true);
  }

  function openEditStageModal(stage: CampaignStage) {
    setEditingStage(stage);
    setSelectedCampaignId(stage.campaignId);
    setStageForm({
      name: stage.name,
      description:
        stage.description == null
          ? stageHint(stage.name)
          : stage.description,
      startsOn: stage.startsOn.slice(0, 10),
      endsOn: stage.endsOn.slice(0, 10),
      statusOverride: stage.statusOverride ?? "",
    });
    setModalError(null);
    setStageModalOpen(true);
  }

  async function createCampaign() {
    setBusy(true);
    setModalError(null);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: Number(year), isActive: false }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
      };
      if (!res.ok) {
        setModalError(json.error || "Не удалось создать кампанию");
        return;
      }
      setCreateOpen(false);
      await load();
      if (json.id) setSelectedCampaignId(json.id);
    } finally {
      setBusy(false);
    }
  }

  async function setCampaignActive(campaign: Campaign, isActive: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          json.error ||
            (isActive
              ? "Не удалось сделать кампанию активной"
              : "Не удалось снять активность"),
        );
        return;
      }
      notifyCampaignChanged(
        isActive
          ? { year: campaign.year, id: campaign.id }
          : { year: null },
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function deleteCampaign() {
    if (!selectedCampaign) return;
    setBusy(true);
    setActionError(null);
    try {
      const id = selectedCampaign.id;
      const wasActive = selectedCampaign.isActive;
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(json.error || "Не удалось удалить кампанию");
        return;
      }
      setDeleteOpen(false);
      setSelectedCampaignId("");
      await load();
      if (wasActive) notifyCampaignChanged({ year: null });
    } finally {
      setBusy(false);
    }
  }

  async function saveStage() {
    if (!selectedCampaignId) return;
    setBusy(true);
    setModalError(null);
    try {
      const statusOverride =
        stageForm.statusOverride === "" ? null : stageForm.statusOverride;
      // Empty string = cleared for this stage only; do not coerce to null
      // (null means "auto by name" for stages that never had a custom text).
      const description = stageForm.description.trim();

      if (editingStage) {
        const res = await fetch(
          `/api/admin/campaign-stages/${editingStage.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: stageForm.name,
              description,
              startsOn: stageForm.startsOn,
              endsOn: stageForm.endsOn,
              statusOverride,
            }),
          },
        );
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setModalError(json.error || "Не удалось сохранить этап");
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
              description,
              startsOn: stageForm.startsOn,
              endsOn: stageForm.endsOn,
              statusOverride,
            }),
          },
        );
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setModalError(json.error || "Не удалось добавить этап");
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

  const todayLabel = today.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Приёмная кампания
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Управление графиком, датами регистрации, тестирования и приёма
            аттестатов
          </p>
        </div>
        <FormButton
          type="button"
          className="w-auto shrink-0 px-4 py-2.5"
          onClick={() => {
            setModalError(null);
            setCreateOpen(true);
          }}
        >
          + Новая кампания
        </FormButton>
      </div>

      <div className="space-y-3 rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="w-[200px] max-w-full shrink-0"
            disabled={items.length === 0}
          >
            {items.length === 0 ? (
              <option value="">Нет кампаний</option>
            ) : (
              items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.year} год
                </option>
              ))
            )}
          </FilterSelect>
          {selectedCampaign ? (
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                selectedCampaign.isActive
                  ? "bg-[#E4F6EC] text-[#176B45]"
                  : "bg-[#eef2f5] text-text-secondary",
              )}
            >
              {selectedCampaign.isActive ? "Активная" : "Неактивная"}
            </span>
          ) : null}
        </div>

        <div className="flex flex-row flex-wrap items-center gap-2">
          {selectedCampaign ? (
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto shrink-0 px-3 py-2"
              disabled={busy}
              onClick={() =>
                void setCampaignActive(
                  selectedCampaign,
                  !selectedCampaign.isActive,
                )
              }
            >
              {selectedCampaign.isActive
                ? "Сделать неактивной"
                : "Сделать активной"}
            </FormButton>
          ) : null}
          <FormButton
            type="button"
            className="w-auto shrink-0 px-4 py-2"
            disabled={!selectedCampaignId}
            onClick={openAddStageModal}
          >
            Добавить этап
          </FormButton>
          <FormButton
            type="button"
            variant="destructive"
            className="w-auto shrink-0 px-3 py-2"
            disabled={!selectedCampaign || busy}
            onClick={() => {
              setActionError(null);
              setDeleteOpen(true);
            }}
          >
            Удалить
          </FormButton>
        </div>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : !selectedCampaign ? (
        <p className="rounded-[14px] border border-border bg-white p-5 text-sm text-text-secondary shadow-[var(--shadow-soft)]">
          Кампании ещё не созданы. Нажмите «Новая кампания».
        </p>
      ) : (
        <>
          <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-text-muted">
                Временная шкала этапов {selectedCampaign.year}
              </h2>
              <p className="text-xs font-semibold text-text-secondary">
                Сегодня: {todayLabel}
              </p>
            </div>

            {sortedStages.length === 0 ? (
              <p className="text-sm text-text-muted">
                Этапы не заданы. Добавьте первый этап кампании.
              </p>
            ) : (
              <div className="overflow-x-auto pb-1">
                <div
                  className="relative grid min-w-[640px] gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${sortedStages.length}, minmax(0, 1fr))`,
                  }}
                >
                  <div className="pointer-events-none absolute left-[8%] right-[8%] top-4 h-1 rounded-full bg-[#e4e9ee]" />
                  <div
                    className="pointer-events-none absolute left-[8%] top-4 h-1 rounded-full bg-brand-700"
                    style={{
                      width: (() => {
                        if (sortedStages.length <= 1) return "0%";
                        const activeIdx = sortedStages.findIndex(
                          (s) => stagePhase(s, today) === "active",
                        );
                        const doneCount = sortedStages.filter(
                          (s) => stagePhase(s, today) === "done",
                        ).length;
                        const progressIdx =
                          activeIdx >= 0 ? activeIdx : Math.max(0, doneCount - 1);
                        const pct =
                          (progressIdx / (sortedStages.length - 1)) * 84;
                        return `${Math.max(0, pct)}%`;
                      })(),
                    }}
                  />

                  {sortedStages.map((stage, index) => {
                    const phase = stagePhase(stage, today);
                    return (
                      <div key={stage.id} className="relative z-[1] text-center">
                        <div className="mb-3 flex justify-center">
                          <span
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-black",
                              phase === "done"
                                ? "bg-[#176B45] text-white"
                                : phase === "active"
                                  ? "bg-[#2F6FAE] text-white"
                                  : "bg-[#d8dee5] text-brand-900",
                            )}
                          >
                            {index + 1}
                          </span>
                        </div>
                        <p className="text-sm font-extrabold leading-snug text-brand-900">
                          {stage.name}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          {formatDateShortRange(stage.startsOn, stage.endsOn)}
                        </p>
                        <span
                          className={cn(
                            "mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                            phaseBadgeClass(phase),
                          )}
                        >
                          {phaseLabel(phase)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border bg-[#f8fafc] text-xs font-bold uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3">Название этапа</th>
                    <th className="px-4 py-3">Начало</th>
                    <th className="px-4 py-3">Окончание</th>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3">Уведомления</th>
                    <th className="px-4 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-text-muted">
                        Этапы не заданы
                      </td>
                    </tr>
                  ) : (
                    sortedStages.map((stage) => {
                      const phase = stagePhase(stage, today);
                      return (
                        <tr
                          key={stage.id}
                          className={cn(
                            "border-t border-border",
                            phase === "active" ? "bg-[#F3F8FC]" : "bg-white",
                          )}
                        >
                          <td className="px-4 py-4">
                            <div className="font-extrabold text-brand-900">
                              {stage.name}
                            </div>
                            {stageDescription(stage) ? (
                              <div className="mt-0.5 max-w-md text-xs text-text-muted">
                                {stageDescription(stage)}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 text-text-secondary">
                            {formatDate(stage.startsOn)}
                          </td>
                          <td className="px-4 py-4 text-text-secondary">
                            {formatDate(stage.endsOn)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 align-middle">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap",
                                phaseBadgeClass(phase),
                              )}
                            >
                              {phaseLabel(phase)}
                              {stage.statusOverride ? (
                                <span className="text-[10px] font-semibold opacity-70">
                                  · вручную
                                </span>
                              ) : null}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-text-secondary">
                            {notificationLabel(phase)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditStageModal(stage)}
                                className="rounded-[10px] border border-border bg-white px-3 py-1.5 text-sm font-bold text-brand-800 hover:bg-[#f4f7f9]"
                              >
                                Редактировать
                              </button>
                              <button
                                type="button"
                                onClick={() => void removeStage(stage.id)}
                                className="rounded-[10px] px-2 py-1.5 text-xs font-bold text-[#c94343] hover:bg-[#fdecec]"
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
        </>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setActionError(null);
        }}
        title="Удалить кампанию?"
        confirmLabel="Удалить"
        variant="destructive"
        busy={busy}
        error={actionError}
        onConfirm={() => void deleteCampaign()}
      >
        {selectedCampaign
          ? `Кампания ${selectedCampaign.year} и все её этапы будут удалены без возможности восстановления.`
          : "Кампания будет удалена."}
      </ConfirmDialog>

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setModalError(null);
        }}
        title="Новая кампания"
        size="sm"
        footer={
          <>
            <FormButton
              type="button"
              variant="secondary"
              className="w-auto px-4 py-2.5"
              onClick={() => {
                setCreateOpen(false);
                setModalError(null);
              }}
              disabled={busy}
            >
              Отмена
            </FormButton>
            <FormButton
              type="button"
              className="w-auto px-4 py-2.5"
              disabled={busy || !year.trim()}
              onClick={() => void createCampaign()}
            >
              Создать
            </FormButton>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Год кампании"
            name="year"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          {modalError && createOpen ? (
            <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {modalError}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={stageModalOpen}
        onClose={() => {
          setStageModalOpen(false);
          setEditingStage(null);
          setStageForm(emptyStageForm);
          setModalError(null);
        }}
        title={editingStage ? "Редактировать этап" : "Добавить этап"}
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
                setModalError(null);
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
            onChange={(e) => {
              const name = e.target.value;
              setStageForm((prev) => {
                const prevAuto = stageHint(prev.name);
                const keepManual =
                  prev.description.trim() !== "" &&
                  prev.description.trim() !== prevAuto;
                return {
                  ...prev,
                  name,
                  description: keepManual ? prev.description : stageHint(name),
                };
              });
            }}
            required
          />
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-text-secondary">
              Описание
            </span>
            <textarea
              name="stageDescription"
              rows={3}
              value={stageForm.description}
              onChange={(e) =>
                setStageForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Кратко, что происходит на этом этапе"
              className="w-full resize-y rounded-[10px] border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
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
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-text-primary">
              Статус этапа
            </span>
            <FilterSelect
              value={stageForm.statusOverride}
              onChange={(e) =>
                setStageForm((prev) => ({
                  ...prev,
                  statusOverride: e.target.value as StageForm["statusOverride"],
                }))
              }
            >
              <option value="">По датам (авто)</option>
              <option value="done">Завершён</option>
              <option value="active">Идёт сейчас</option>
              <option value="upcoming">Впереди</option>
            </FilterSelect>
            <span className="text-xs text-text-muted">
              Авто: после окончания — Завершён, в диапазоне дат — Идёт сейчас,
              до начала — Впереди.
            </span>
          </label>
          {modalError ? (
            <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {modalError}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
