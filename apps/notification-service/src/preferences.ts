import { prisma } from "./db.js";

export type ModeratorNotifKind =
  | "verificationQueue"
  | "ctApplications"
  | "decisions";

export type DefaultQueueTab =
  | "overview"
  | "docs"
  | "applications"
  | "history";

export type NotificationPreferencesDto = {
  userId: string;
  allEnabled: boolean;
  verificationQueue: boolean;
  ctApplications: boolean;
  decisions: boolean;
  defaultQueueTab: DefaultQueueTab;
  updatedAt: string;
};

const QUEUE_TABS = new Set<DefaultQueueTab>([
  "overview",
  "docs",
  "applications",
  "history",
]);

export function parseDefaultQueueTab(value: string): DefaultQueueTab {
  if (QUEUE_TABS.has(value as DefaultQueueTab)) {
    return value as DefaultQueueTab;
  }
  return "overview";
}

function prefsJson(row: {
  userId: string;
  allEnabled: boolean;
  verificationQueue: boolean;
  ctApplications: boolean;
  decisions: boolean;
  defaultQueueTab: string;
  updatedAt: Date;
}): NotificationPreferencesDto {
  return {
    userId: row.userId,
    allEnabled: row.allEnabled,
    verificationQueue: row.verificationQueue,
    ctApplications: row.ctApplications,
    decisions: row.decisions,
    defaultQueueTab: parseDefaultQueueTab(row.defaultQueueTab),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getOrCreatePreferences(userId: string) {
  const existing = await prisma.notificationPreferences.findUnique({
    where: { userId },
  });
  if (existing) return existing;
  return prisma.notificationPreferences.create({
    data: { userId },
  });
}

export async function getPreferencesDto(
  userId: string,
): Promise<NotificationPreferencesDto> {
  const row = await getOrCreatePreferences(userId);
  return prefsJson(row);
}

/**
 * Call before creating in-app notifications for moderators.
 * When no row exists, defaults are all enabled (getOrCreate).
 * Applicant/system kinds are unaffected — use isKindEnabled for those.
 */
export async function isUserPrefEnabled(
  userId: string,
  kind: ModeratorNotifKind,
): Promise<boolean> {
  const row = await getOrCreatePreferences(userId);
  if (!row.allEnabled) return false;
  if (kind === "verificationQueue") return row.verificationQueue;
  if (kind === "ctApplications") return row.ctApplications;
  return row.decisions;
}
