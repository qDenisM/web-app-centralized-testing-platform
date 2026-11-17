import { catalogPublicGet } from "@/lib/catalog-api";
import type { SystemSettings } from "@/lib/system-settings";

export async function getSystemSettings(): Promise<SystemSettings | null> {
  const result = await catalogPublicGet<SystemSettings>("/system-settings");
  if (!result.ok) return null;
  return result.data;
}

/** Registration allowed only when open and not in maintenance. */
export function canRegister(settings: SystemSettings | null): boolean {
  if (!settings) return true;
  return settings.registrationOpen && !settings.maintenanceMode;
}

/** CT apply allowed only when open and not in maintenance. */
export function canApplyToCt(settings: SystemSettings | null): boolean {
  if (!settings) return true;
  return settings.ctApplicationsOpen && !settings.maintenanceMode;
}

/** OCR allowed only when enabled and not in maintenance. */
export function canUseOcr(settings: SystemSettings | null): boolean {
  if (!settings) return true;
  return settings.ocrEnabled && !settings.maintenanceMode;
}
