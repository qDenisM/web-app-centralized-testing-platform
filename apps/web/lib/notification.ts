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
