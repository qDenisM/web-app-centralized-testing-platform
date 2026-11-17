"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { ApplicantProfile } from "@/lib/applicant";
import { computeCompetitiveScore } from "@/lib/competitive-score";
import type { CtResult } from "@/lib/results";

export function CompetitiveScoreBadge() {
  const pathname = usePathname();
  const [label, setLabel] = useState("—");

  const load = useCallback(async () => {
    try {
      const [resultsRes, profileRes, examsRes] = await Promise.all([
        fetch("/api/results/me", { cache: "no-store" }),
        fetch("/api/applicant/profile", { cache: "no-store" }),
        fetch("/api/exam/exams", { cache: "no-store" }),
      ]);
      const results = (await resultsRes.json().catch(() => [])) as CtResult[];
      const profile = (await profileRes.json().catch(() => null)) as
        | ApplicantProfile
        | null;
      const exams = (await examsRes.json().catch(() => [])) as Array<{
        id: string;
        subjectId: string;
      }>;

      const { competitive } = computeCompetitiveScore({
        results: Array.isArray(results) ? results : [],
        profile,
        exams: Array.isArray(exams) ? exams : [],
      });
      setLabel(competitive != null ? String(competitive) : "—");
    } catch {
      setLabel("—");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  useEffect(() => {
    function onFocus() {
      void load();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  return (
    <span className="hidden rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-900 sm:inline">
      Конкурсный балл: {label} / 400
    </span>
  );
}
