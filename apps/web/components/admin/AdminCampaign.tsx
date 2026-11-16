"use client";

import { useCallback, useEffect, useState } from "react";
import type { Campaign } from "@/lib/admin";
import { Input } from "@/components/ui/Input";
import { FormButton } from "@/components/ui/FormButton";

export function AdminCampaign() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [stageName, setStageName] = useState("");
  const [stageCampaignId, setStageCampaignId] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/campaigns");
      const json = (await res.json().catch(() => ({}))) as Campaign[] & { error?: string };
      if (!res.ok) {
        setError(json.error || "Не удалось загрузить кампании");
        return;
      }
      const rows = Array.isArray(json) ? json : [];
      setItems(rows);
      if (rows[0]) {
        setStageCampaignId((prev) => prev || rows[0].id);
      }
    } catch {
      setError("Сеть недоступна.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  async function addStage(e: React.FormEvent) {
    e.preventDefault();
    if (!stageCampaignId) return;
    const res = await fetch(`/api/admin/campaigns/${stageCampaignId}/stages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sortOrder: 1,
        name: stageName,
        startsOn,
        endsOn,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(json.error || "Не удалось добавить этап");
      return;
    }
    setStageName("");
    await load();
  }

  async function removeStage(stageId: string) {
    const res = await fetch(`/api/admin/campaign-stages/${stageId}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error || "Не удалось удалить этап");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">Кампания</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Год приёмной кампании и этапы по календарю.
        </p>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(e) => void createCampaign(e)}
        className="flex flex-wrap items-end gap-3 rounded-[14px] border border-border bg-white p-5"
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

      <form
        onSubmit={(e) => void addStage(e)}
        className="grid gap-3 rounded-[14px] border border-border bg-white p-5 sm:grid-cols-2"
      >
        <label className="block space-y-1.5 text-sm sm:col-span-2">
          <span className="font-semibold text-text-secondary">Кампания</span>
          <select
            className="w-full rounded-[10px] border border-border px-3 py-2"
            value={stageCampaignId}
            onChange={(e) => setStageCampaignId(e.target.value)}
          >
            {items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.year}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Название этапа"
          name="stageName"
          value={stageName}
          onChange={(e) => setStageName(e.target.value)}
          required
        />
        <Input
          label="Начало"
          name="startsOn"
          type="date"
          value={startsOn}
          onChange={(e) => setStartsOn(e.target.value)}
          required
        />
        <Input
          label="Окончание"
          name="endsOn"
          type="date"
          value={endsOn}
          onChange={(e) => setEndsOn(e.target.value)}
          required
        />
        <FormButton type="submit" className="sm:col-span-2 sm:w-auto">
          Добавить этап
        </FormButton>
      </form>

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : (
        <div className="space-y-4">
          {items.map((campaign) => (
            <article
              key={campaign.id}
              className="rounded-[14px] border border-border bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-brand-900">
                  {campaign.year}
                  {campaign.isActive ? (
                    <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-900">
                      Активная
                    </span>
                  ) : null}
                </h3>
                {!campaign.isActive ? (
                  <button
                    type="button"
                    onClick={() => void setActive(campaign)}
                    className="text-sm font-semibold text-brand-700"
                  >
                    Сделать активной
                  </button>
                ) : null}
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {(campaign.stages || []).length === 0 ? (
                  <li className="text-text-muted">Этапы не заданы</li>
                ) : (
                  (campaign.stages || []).map((stage) => (
                    <li
                      key={stage.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-[#f8fafc] px-3 py-2"
                    >
                      <span>
                        {stage.name}: {stage.startsOn} — {stage.endsOn}
                      </span>
                      <button
                        type="button"
                        onClick={() => void removeStage(stage.id)}
                        className="text-xs font-semibold text-red-600"
                      >
                        Удалить
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}