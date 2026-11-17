"use client";

import { useCallback, useEffect, useState } from "react";
import type { SystemSettings } from "@/lib/system-settings";

export function useSystemSettings() {
  const [system, setSystem] = useState<SystemSettings | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/system-settings", { cache: "no-store" });
      if (!res.ok) return;
      setSystem((await res.json()) as SystemSettings);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    function onRefresh() {
      void load();
    }
    window.addEventListener("focus", onRefresh);
    window.addEventListener("abiturent:system-settings-changed", onRefresh);
    return () => {
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("abiturent:system-settings-changed", onRefresh);
    };
  }, [load]);

  return system;
}

export function MaintenanceBanner({
  audience = "applicant",
}: {
  audience?: "applicant" | "admin";
}) {
  const system = useSystemSettings();
  if (!system?.maintenanceMode) return null;

  return (
    <div className="mb-4 rounded-[12px] border border-[#E6C65C] bg-[#FFF8DF] px-4 py-3 text-sm font-medium leading-relaxed text-[#8A6A00]">
      {audience === "admin" ? (
        <>
          Включён режим обслуживания: регистрация, запись на ЦТ и OCR аттестата
          для абитуриентов недоступны.
        </>
      ) : (
        <>
          Ведутся технические работы. Регистрация новых аккаунтов, запись на ЦТ и
          распознавание аттестата временно недоступны. Остальные разделы кабинета
          можно просматривать.
        </>
      )}
    </div>
  );
}
