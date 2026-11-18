import {
  EVENT_APPLICATION_APPROVED,
  EVENT_APPLICATION_REJECTED,
  EVENT_APPLICATION_SUBMITTED,
  EVENT_RESULT_PUBLISHED,
  EVENT_VERIFICATION_DECIDED,
  EVENT_VERIFICATION_SUBMITTED,
  type ApplicationApprovedEvent,
  type ApplicationRejectedEvent,
  type ApplicationSubmittedEvent,
  type ResultPublishedEvent,
  type VerificationDecidedEvent,
  type VerificationSubmittedEvent,
} from "@abiturent/contracts";
import { consumeEvents, type RabbitClient } from "@abiturent/service-kit";
import { prisma } from "./db.js";
import { listModeratorUserIds } from "./identity.js";
import {
  isUserPrefEnabled,
  type ModeratorNotifKind,
} from "./preferences.js";
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
  if (decision === "pending") {
    return {
      title: "Анкета снова на проверке",
      body: reason
        ? `Модератор вернул анкету в очередь проверки. ${reason}`
        : "Модератор вернул анкету в очередь проверки.",
    };
  }
  return {
    title: "В анкете отказано",
    body: reason
      ? `Модератор отклонил анкету. Причина: ${reason}`
      : "Модератор отклонил анкету.",
  };
}

function isVerificationSubmitted(
  payload: unknown,
): payload is VerificationSubmittedEvent {
  if (!payload || typeof payload !== "object") return false;
  const row = payload as Partial<VerificationSubmittedEvent>;
  return (
    row.type === EVENT_VERIFICATION_SUBMITTED &&
    typeof row.userId === "string" &&
    typeof row.verificationId === "string"
  );
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

function isApplicationSubmitted(
  payload: unknown,
): payload is ApplicationSubmittedEvent {
  if (!payload || typeof payload !== "object") return false;
  const row = payload as Partial<ApplicationSubmittedEvent>;
  return (
    row.type === EVENT_APPLICATION_SUBMITTED &&
    typeof row.userId === "string" &&
    typeof row.applicationId === "string" &&
    typeof row.examId === "string"
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

function isApplicationRejected(
  payload: unknown,
): payload is ApplicationRejectedEvent {
  if (!payload || typeof payload !== "object") return false;
  const row = payload as Partial<ApplicationRejectedEvent>;
  return (
    row.type === EVENT_APPLICATION_REJECTED &&
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

async function fanOutToModerators(input: {
  kind: ModeratorNotifKind;
  title: string;
  body: string;
}): Promise<void> {
  const moderatorIds = await listModeratorUserIds();
  if (moderatorIds.length === 0) return;

  for (const userId of moderatorIds) {
    if (!(await isUserPrefEnabled(userId, input.kind))) continue;
    await prisma.notification.create({
      data: {
        userId,
        channel: "in_app",
        title: input.title,
        body: input.body,
      },
    });
  }
}

export async function startNotificationConsumers(
  client: RabbitClient,
): Promise<void> {
  await consumeEvents(client, {
    queue: "notification.verification.submitted",
    routingKey: EVENT_VERIFICATION_SUBMITTED,
    onMessage: async (payload) => {
      if (!isVerificationSubmitted(payload)) return;

      await fanOutToModerators({
        kind: "verificationQueue",
        title: "Новая анкета на проверку",
        body: "Поступила новая заявка на верификацию персональных данных. Откройте очередь проверки данных.",
      });
    },
  });

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
    queue: "notification.application.submitted",
    routingKey: EVENT_APPLICATION_SUBMITTED,
    onMessage: async (payload) => {
      if (!isApplicationSubmitted(payload)) return;

      await fanOutToModerators({
        kind: "ctApplications",
        title: "Новая заявка на ЦТ",
        body: "В очереди появилось новое заявление на централизованное тестирование.",
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
    queue: "notification.application.rejected",
    routingKey: EVENT_APPLICATION_REJECTED,
    onMessage: async (payload) => {
      if (!isApplicationRejected(payload)) return;
      if (!(await isKindEnabled("application"))) return;

      const reasonLine = payload.reason
        ? ` Причина: ${payload.reason}.`
        : "";
      await prisma.notification.create({
        data: {
          userId: payload.userId,
          channel: "in_app",
          title: "Заявка на ЦТ отклонена",
          body: `Модератор отклонил запись на экзамен.${reasonLine} Подробности — во вкладке «Расписание» кабинета.`,
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
