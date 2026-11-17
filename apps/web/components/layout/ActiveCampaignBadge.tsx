"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CAMPAIGN_CHANGED_EVENT,
  type CampaignChangedDetail,
} from "@/lib/campaign-events";

type ActiveCampaign = {
  id: string;
  year: number;
  isActive?: boolean;
} | null;

export function ActiveCampaignBadge({ className }: { className?: string }) {
  const [campaign, setCampaign] = useState<ActiveCampaign | undefined>(
    undefined,
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/catalog/campaigns/active", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) {
        setCampaign(null);
        return;
      }
      const data = (await res.json().catch(() => null)) as ActiveCampaign;
      setCampaign(data && data.year ? data : null);
    } catch {
      setCampaign(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const res = await fetch("/api/catalog/campaigns/active", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (cancelled) return;
        if (!res.ok) {
          setCampaign(null);
          return;
        }
        const data = (await res.json().catch(() => null)) as ActiveCampaign;
        if (!cancelled) setCampaign(data && data.year ? data : null);
      } catch {
        if (!cancelled) setCampaign(null);
      }
    }

    void initialLoad();

    function onCampaignChanged(event: Event) {
      const detail = (event as CustomEvent<CampaignChangedDetail>).detail;
      if (detail && "year" in detail) {
        if (detail.year == null) {
          setCampaign(null);
        } else {
          setCampaign({
            id: detail.id ?? "local",
            year: detail.year,
            isActive: true,
          });
        }
      }
      void load();
    }

    function onFocus() {
      void load();
    }

    window.addEventListener(CAMPAIGN_CHANGED_EVENT, onCampaignChanged);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener(CAMPAIGN_CHANGED_EVENT, onCampaignChanged);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  if (campaign === undefined) {
    return (
      <span
        className={cn(
          "hidden rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-900 sm:inline",
          className,
        )}
      >
        Кампания…
      </span>
    );
  }

  if (!campaign) {
    return (
      <span
        className={cn(
          "hidden rounded-full border border-[#C6900A]/30 bg-[#FFF4D6] px-3 py-1 text-xs font-semibold text-[#9A6B00] sm:inline",
          className,
        )}
      >
        Кампания не активна
      </span>
    );
  }

  return (
    <span
      className={cn(
        "hidden rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-900 sm:inline",
        className,
      )}
    >
      Кампания: {campaign.year} · Online
    </span>
  );
}
