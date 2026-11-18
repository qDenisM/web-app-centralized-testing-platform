import {
  EVENT_APPLICATION_APPROVED,
  EVENT_APPLICATION_REJECTED,
  EVENT_APPLICATION_SUBMITTED,
  type ApplicationApprovedEvent,
  type ApplicationRejectedEvent,
  type ApplicationSubmittedEvent,
} from "@abiturent/contracts";
import { publishEvent, type RabbitClient } from "@abiturent/service-kit";

let rabbit: RabbitClient | null = null;

/** Events are published inline after commit (no transactional outbox in service-kit). */
export function setRabbitClient(client: RabbitClient | null) {
  rabbit = client;
}

export async function publishApplicationSubmitted(input: {
  userId: string;
  applicationId: string;
  examId: string;
}): Promise<void> {
  if (!rabbit) return;

  const payload: ApplicationSubmittedEvent = {
    type: EVENT_APPLICATION_SUBMITTED,
    userId: input.userId,
    applicationId: input.applicationId,
    examId: input.examId,
    at: new Date().toISOString(),
  };

  await publishEvent(rabbit, EVENT_APPLICATION_SUBMITTED, payload);
}

export async function publishApplicationApproved(input: {
  userId: string;
  applicationId: string;
  examId: string;
  passNumber: string | null;
}): Promise<void> {
  if (!rabbit) return;

  const payload: ApplicationApprovedEvent = {
    type: EVENT_APPLICATION_APPROVED,
    userId: input.userId,
    applicationId: input.applicationId,
    examId: input.examId,
    passNumber: input.passNumber,
    at: new Date().toISOString(),
  };

  await publishEvent(rabbit, EVENT_APPLICATION_APPROVED, payload);
}

export async function publishApplicationRejected(input: {
  userId: string;
  applicationId: string;
  examId: string;
  reason: string | null;
}): Promise<void> {
  if (!rabbit) return;

  const payload: ApplicationRejectedEvent = {
    type: EVENT_APPLICATION_REJECTED,
    userId: input.userId,
    applicationId: input.applicationId,
    examId: input.examId,
    reason: input.reason,
    at: new Date().toISOString(),
  };

  await publishEvent(rabbit, EVENT_APPLICATION_REJECTED, payload);
}