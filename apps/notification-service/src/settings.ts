import { prisma } from "./db.js";

export type NotificationKind =
  | "verification"
  | "application"
  | "result";

export type NotificationSettingsDto = {
  allEnabled: boolean;
  verificationEnabled: boolean;
  applicationEnabled: boolean;
  resultEnabled: boolean;
  updatedAt: string;
};

function settingsJson(row: {
  allEnabled: boolean;
  verificationEnabled: boolean;
  applicationEnabled: boolean;
  resultEnabled: boolean;
  updatedAt: Date;
}): NotificationSettingsDto {
  return {
    allEnabled: row.allEnabled,
    verificationEnabled: row.verificationEnabled,
    applicationEnabled: row.applicationEnabled,
    resultEnabled: row.resultEnabled,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getOrCreateSettings() {
  const existing = await prisma.notificationSettings.findUnique({
    where: { id: "default" },
  });
  if (existing) return existing;
  return prisma.notificationSettings.create({
    data: { id: "default" },
  });
}

export async function getSettingsDto(): Promise<NotificationSettingsDto> {
  const row = await getOrCreateSettings();
  return settingsJson(row);
}

export async function isKindEnabled(kind: NotificationKind): Promise<boolean> {
  const row = await getOrCreateSettings();
  if (!row.allEnabled) return false;
  if (kind === "verification") return row.verificationEnabled;
  if (kind === "application") return row.applicationEnabled;
  return row.resultEnabled;
}
