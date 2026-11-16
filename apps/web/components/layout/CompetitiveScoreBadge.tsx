"use client";

import { useEffect, useState } from "react";
import type { ApplicantProfile } from "@/lib/applicant";
import type { CtResult } from "@/lib/results";

export function CompetitiveScoreBadge() {
  const [label, setLabel] = useState("—");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [resultsRes, profileRes] = await Promise.all([
          fetch("/api/results/me"),
          fetch("/api/applicant/profile"),
        ]);
        const results = (await resultsRes.json().catch(() => [])) as CtResult[];
        const profile = (await profileRes.json().catch(() => null)) as
          | ApplicantProfile
          | null;
        if (cancelled) return;
        const published = Array.isArray(results)
          ? results.filter(
              (r) => r.status === "published" && typeof r.score === "number",
            )
          : [];
        const ctSum = published.reduce((a, r) => a + (r.score || 0), 0);
        const attestat = profile?.attestatAverage;
        if (attestat == null || published.length === 0) {
          setLabel("—");
          return;
        }
        const competitive = Math.round((ctSum + attestat * 10) * 10) / 10;
        setLabel(String(competitive));
      } catch {
        if (!cancelled) setLabel("—");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <span className="hidden rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-900 sm:inline">
      Конкурсный балл: {label} / 400
    </span>
  );
}
