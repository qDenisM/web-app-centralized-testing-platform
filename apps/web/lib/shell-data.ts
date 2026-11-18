"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { ApplicantProfile } from "@/lib/applicant";
import {
  cachedFetch,
  clearCache,
  getCacheMeta,
  peekCache,
  setCacheData,
  subscribeCache,
} from "@/lib/client-cache";
import type { CtResult } from "@/lib/results";
import type { SystemSettings } from "@/lib/system-settings";

/** Shared cache keys for RoleShell + child pages. */
export const SHELL_KEYS = {
  me: "shell:users/me",
  notifications: "shell:notifications/me",
  profile: "shell:applicant/profile",
  results: "shell:results/me",
  exams: "shell:exam/exams",
  systemSettings: "shell:system-settings",
} as const;

export type ShellMeUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
};

type ExamRow = { id: string; subjectId: string; startsAt?: string };

async function parseJson<T>(res: Response): Promise<T | null> {
  return (await res.json().catch(() => null)) as T | null;
}

export async function fetchShellMe(force = false): Promise<ShellMeUser | null> {
  return cachedFetch(
    SHELL_KEYS.me,
    async () => {
      const res = await fetch("/api/users/me", { cache: "no-store" });
      const data = await parseJson<ShellMeUser & { error?: string }>(res);
      if (!res.ok || !data?.id || !data.fullName) return null;
      return {
        id: data.id,
        email: data.email,
        fullName: data.fullName,
        phone: data.phone ?? null,
        role: data.role,
      };
    },
    { force, ttlMs: 60_000 },
  );
}

export async function fetchShellProfile(
  force = false,
): Promise<ApplicantProfile | null> {
  return cachedFetch(
    SHELL_KEYS.profile,
    async () => {
      const res = await fetch("/api/applicant/profile", { cache: "no-store" });
      const data = await parseJson<ApplicantProfile | { error?: string }>(res);
      if (!res.ok || !data || "error" in data) return null;
      return data as ApplicantProfile;
    },
    { force, ttlMs: 30_000 },
  );
}

export async function fetchShellResults(force = false): Promise<CtResult[]> {
  return cachedFetch(
    SHELL_KEYS.results,
    async () => {
      const res = await fetch("/api/results/me", { cache: "no-store" });
      const data = await parseJson<CtResult[] | { error?: string }>(res);
      return res.ok && Array.isArray(data) ? data : [];
    },
    { force, ttlMs: 30_000 },
  );
}

export async function fetchShellExams(force = false): Promise<ExamRow[]> {
  return cachedFetch(
    SHELL_KEYS.exams,
    async () => {
      const res = await fetch("/api/exam/exams", { cache: "no-store" });
      const data = await parseJson<ExamRow[] | { error?: string }>(res);
      return res.ok && Array.isArray(data) ? data : [];
    },
    { force, ttlMs: 60_000 },
  );
}

export async function fetchShellSystemSettings(
  force = false,
): Promise<SystemSettings | null> {
  return cachedFetch(
    SHELL_KEYS.systemSettings,
    async () => {
      const res = await fetch("/api/system-settings", { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as SystemSettings;
    },
    { force, ttlMs: 60_000 },
  );
}

/** Score-related endpoints used by badge + dashboard. */
export async function fetchCompetitiveScoreInputs(force = false) {
  const [results, profile, exams] = await Promise.all([
    fetchShellResults(force),
    fetchShellProfile(force),
    fetchShellExams(force),
  ]);
  return { results, profile, exams };
}

export function writeShellProfile(profile: ApplicantProfile | null) {
  setCacheData(SHELL_KEYS.profile, profile);
}

export function writeShellResults(results: CtResult[]) {
  setCacheData(SHELL_KEYS.results, results);
}

export function writeShellExams(exams: ExamRow[]) {
  setCacheData(SHELL_KEYS.exams, exams);
}

export function clearShellSessionCache() {
  clearCache([
    SHELL_KEYS.me,
    SHELL_KEYS.notifications,
    SHELL_KEYS.profile,
    SHELL_KEYS.results,
    SHELL_KEYS.exams,
    SHELL_KEYS.systemSettings,
  ]);
}

function useCacheSnapshot<T>(key: string): T | undefined {
  return useSyncExternalStore(
    (onStoreChange) => subscribeCache(key, onStoreChange),
    () => peekCache<T>(key),
    () => undefined,
  );
}

/**
 * Prefetch shell endpoints once when the RoleShell mounts so child pages
 * hit warm cache instead of starting a new waterfall.
 */
export function ShellDataPrefetch({
  includeScore = false,
}: {
  includeScore?: boolean;
}) {
  useEffect(() => {
    void fetchShellMe();
    void fetchShellSystemSettings();
    if (includeScore) {
      void fetchCompetitiveScoreInputs();
    }
  }, [includeScore]);

  return null;
}

export function useShellMe() {
  const cached = useCacheSnapshot<ShellMeUser | null>(SHELL_KEYS.me);
  const [user, setUser] = useState<ShellMeUser | null>(cached ?? null);
  const [loading, setLoading] = useState(cached === undefined);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const next = await fetchShellMe(force);
      setUser(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cached !== undefined) {
      setUser(cached);
      setLoading(false);
      return;
    }
    void load();
  }, [cached, load]);

  return { user, loading, load };
}

export function useSystemSettingsCached() {
  const cached = useCacheSnapshot<SystemSettings | null>(
    SHELL_KEYS.systemSettings,
  );
  const [system, setSystem] = useState<SystemSettings | null>(cached ?? null);

  const load = useCallback(async (force = false) => {
    const next = await fetchShellSystemSettings(force);
    setSystem(next);
    return next;
  }, []);

  useEffect(() => {
    if (cached !== undefined) {
      setSystem(cached);
      return;
    }
    void load();

    function onRefresh() {
      void load(true);
    }
    window.addEventListener("focus", onRefresh);
    window.addEventListener("abiturent:system-settings-changed", onRefresh);
    return () => {
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("abiturent:system-settings-changed", onRefresh);
    };
  }, [cached, load]);

  return system;
}

export function useCompetitiveScoreInputs() {
  const results = useCacheSnapshot<CtResult[]>(SHELL_KEYS.results);
  const profile = useCacheSnapshot<ApplicantProfile | null>(SHELL_KEYS.profile);
  const exams = useCacheSnapshot<ExamRow[]>(SHELL_KEYS.exams);
  const meta = getCacheMeta(SHELL_KEYS.results);
  const [loading, setLoading] = useState(
    results === undefined || profile === undefined || exams === undefined,
  );

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      return await fetchCompetitiveScoreInputs(force);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      results !== undefined &&
      profile !== undefined &&
      exams !== undefined &&
      meta.updatedAt > 0
    ) {
      setLoading(false);
      return;
    }
    void load();
  }, [results, profile, exams, meta.updatedAt, load]);

  return {
    results: results ?? [],
    profile: profile ?? null,
    exams: exams ?? [],
    loading,
    load,
  };
}
