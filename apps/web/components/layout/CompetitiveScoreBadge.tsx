"use client";

import { useEffect } from "react";
import { computeCompetitiveScore } from "@/lib/competitive-score";
import { useCompetitiveScoreInputs } from "@/lib/shell-data";

export function CompetitiveScoreBadge() {
  const { results, profile, exams, load } = useCompetitiveScoreInputs();

  // Soft refresh on focus/visibility; shared cache avoids duplicate fetches
  // when ApplicantDashboard (or other pages) already warmed the keys.
  useEffect(() => {
    function onFocus() {
      void load(true);
    }
    function onVisibility() {
      if (document.visibilityState === "visible") onFocus();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const { competitive } = computeCompetitiveScore({
    results,
    profile,
    exams,
  });
  const label = competitive != null ? String(competitive) : "—";

  return (
    <span className="hidden rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-900 sm:inline">
      Конкурсный балл: {label} / 400
    </span>
  );
}
