import { config } from "./config.js";

export async function sendNotification(input: {
  userId: string;
  title: string;
  body: string;
}): Promise<void> {
  try {
    await fetch(`${config.notificationUrl}/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        userId: input.userId,
        channel: "in_app",
        title: input.title,
        body: input.body,
      }),
    });
  } catch {
    return;
  }
}

export function decisionNotificationText(
  decision: "approved" | "returned" | "rejected",
  reason?: string | null,
): { title: string; body: string } {
  if (decision === "approved") {
    return {
      title: "Анкета подтверждена",
      body: "Модератор подтвердил ваши персональные данные. Можно продолжать запись на ЦТ.",
    };
  }
  if (decision === "returned") {
    return {
      title: "Анкета возвращена на исправление",
      body: reason?.trim()
        ? `Проверьте данные и отправьте снова. Причина: ${reason.trim()}`
        : "Проверьте данные и отправьте анкету снова.",
    };
  }
  return {
    title: "В анкете отказано",
    body: reason?.trim()
      ? `Модератор отклонил анкету. Причина: ${reason.trim()}`
      : "Модератор отклонил анкету.",
  };
}
