import {
  EVENT_VERIFICATION_DECIDED,
  type VerificationDecidedEvent,
} from "@abiturent/contracts";
import { consumeEvents, type RabbitClient } from "@abiturent/service-kit";
import { prisma } from "./db.js";

function textForDecision(
  decision: VerificationDecidedEvent["decision"],
  reason: string | null,
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
      body: reason
        ? `Проверьте данные и отправьте снова. Причина: ${reason}`
        : "Проверьте данные и отправьте анкету снова.",
    };
  }
  return {
    title: "В анкете отказано",
    body: reason
      ? `Модератор отклонил анкету. Причина: ${reason}`
      : "Модератор отклонил анкету.",
  };
}

function isVerificationDecided(payload: unknown): payload is VerificationDecidedEvent {
  if (!payload || typeof payload !== "object") return false;
  const row = payload as Partial<VerificationDecidedEvent>;
  return (
    row.type === EVENT_VERIFICATION_DECIDED &&
    typeof row.userId === "string" &&
    typeof row.decision === "string"
  );
}

export async function startNotificationConsumers(
  client: RabbitClient,
): Promise<void> {
  await consumeEvents(client, {
    queue: "notification.verification.decided",
    routingKey: EVENT_VERIFICATION_DECIDED,
    onMessage: async (payload) => {
      if (!isVerificationDecided(payload)) return;

      const text = textForDecision(payload.decision, payload.reason);
      await prisma.notification.create({
        data: {
          userId: payload.userId,
          channel: "in_app",
          title: text.title,
          body: text.body,
        },
      });
    },
  });
}
