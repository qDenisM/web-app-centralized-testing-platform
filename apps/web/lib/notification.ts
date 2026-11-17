export function getNotificationUrl(): string {
  return (
    process.env.NOTIFICATION_URL?.replace(/\/$/, "") || "http://localhost:3007"
  );
}

export type AppNotification = {
  id: string;
  userId: string;
  channel: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationSettings = {
  allEnabled: boolean;
  verificationEnabled: boolean;
  applicationEnabled: boolean;
  resultEnabled: boolean;
  updatedAt: string;
};

export type ModeratorDefaultQueueTab =
  | "overview"
  | "docs"
  | "applications"
  | "history";

/** Per-user prefs (moderator cabinet). Stored in notification-service. */
export type NotificationPreferences = {
  userId: string;
  allEnabled: boolean;
  verificationQueue: boolean;
  ctApplications: boolean;
  decisions: boolean;
  defaultQueueTab: ModeratorDefaultQueueTab;
  updatedAt: string;
};

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
