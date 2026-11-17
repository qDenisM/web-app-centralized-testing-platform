import {
  EVENT_APPLICATION_APPROVED,
  EVENT_RESULT_PUBLISHED,
  EVENT_VERIFICATION_DECIDED,
  type ApplicationApprovedEvent,
  type ResultPublishedEvent,
  type VerificationDecidedEvent,
} from "@abiturent/contracts";
import { consumeEvents, type RabbitClient } from "@abiturent/service-kit";
import { prisma } from "./db.js";
import { isKindEnabled } from "./settings.js";

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

function isApplicationApproved(
  payload: unknown,
): payload is ApplicationApprovedEvent {
  if (!payload || typeof payload !== "object") return false;
  const row = payload as Partial<ApplicationApprovedEvent>;
  return (
    row.type === EVENT_APPLICATION_APPROVED &&
    typeof row.userId === "string" &&
    typeof row.applicationId === "string"
  );
}

function isResultPublished(payload: unknown): payload is ResultPublishedEvent {
  if (!payload || typeof payload !== "object") return false;
  const row = payload as Partial<ResultPublishedEvent>;
  return (
    row.type === EVENT_RESULT_PUBLISHED &&
    typeof row.userId === "string" &&
    typeof row.score === "number"
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
      if (!(await isKindEnabled("verification"))) return;

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

  await consumeEvents(client, {
    queue: "notification.application.approved",
    routingKey: EVENT_APPLICATION_APPROVED,
    onMessage: async (payload) => {
      if (!isApplicationApproved(payload)) return;
      if (!(await isKindEnabled("application"))) return;

      const passLine = payload.passNumber
        ? ` Номер пропуска: ${payload.passNumber}.`
        : "";
      await prisma.notification.create({
        data: {
          userId: payload.userId,
          channel: "in_app",
          title: "Допуск на ЦТ подтверждён",
          body: `Модератор одобрил запись на экзамен.${passLine} Скачайте пропуск во вкладке «Расписание».`,
        },
      });
    },
  });

  await consumeEvents(client, {
    queue: "notification.result.published",
    routingKey: EVENT_RESULT_PUBLISHED,
    onMessage: async (payload) => {
      if (!isResultPublished(payload)) return;
      if (!(await isKindEnabled("result"))) return;

      await prisma.notification.create({
        data: {
          userId: payload.userId,
          channel: "in_app",
          title: "Опубликован результат ЦТ",
          body: `Ваш балл по экзамену: ${payload.score}. Смотрите вкладку «Результаты» в кабинете.`,
        },
      });
    },
  });
}
