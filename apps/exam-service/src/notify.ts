import {
  EVENT_APPLICATION_APPROVED,
  type ApplicationApprovedEvent,
} from "@abiturent/contracts";
import { publishEvent, type RabbitClient } from "@abiturent/service-kit";

let rabbit: RabbitClient | null = null;

/** Events are published inline after commit (no transactional outbox in service-kit). */
export function setRabbitClient(client: RabbitClient | null) {
  rabbit = client;
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