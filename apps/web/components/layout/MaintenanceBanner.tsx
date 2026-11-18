"use client";

import { useSystemSettingsCached } from "@/lib/shell-data";

export { useSystemSettingsCached as useSystemSettings } from "@/lib/shell-data";

export function MaintenanceBanner({
  audience = "applicant",
}: {
  audience?: "applicant" | "admin";
}) {
  const system = useSystemSettingsCached();
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
