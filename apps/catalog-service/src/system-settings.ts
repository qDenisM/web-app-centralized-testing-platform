import { prisma } from "./db.js";

export type SystemSettingsDto = {
  dataMode: "production" | "demo";
  registrationOpen: boolean;
  ctApplicationsOpen: boolean;
  ocrEnabled: boolean;
  maintenanceMode: boolean;
  updatedAt: string;
};

function normalizeMode(value: string): "production" | "demo" {
  return value === "demo" ? "demo" : "production";
}

export function systemSettingsJson(row: {
  dataMode: string;
  registrationOpen: boolean;
  ctApplicationsOpen: boolean;
  ocrEnabled: boolean;
  maintenanceMode: boolean;
  updatedAt: Date;
}): SystemSettingsDto {
  return {
    dataMode: normalizeMode(row.dataMode),
    registrationOpen: row.registrationOpen,
    ctApplicationsOpen: row.ctApplicationsOpen,
    ocrEnabled: row.ocrEnabled,
    maintenanceMode: row.maintenanceMode,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getOrCreateSystemSettings() {
  const existing = await prisma.systemSettings.findUnique({
    where: { id: "default" },
  });
  if (existing) return existing;
  return prisma.systemSettings.create({
    data: { id: "default" },
  });
}
