import {
  EVENT_VERIFICATION_DECIDED,
  type VerificationDecidedEvent,
} from "@abiturent/contracts";
import { publishEvent, type RabbitClient } from "@abiturent/service-kit";

let rabbit: RabbitClient | null = null;

export function setRabbitClient(client: RabbitClient | null) {
  rabbit = client;
}

export async function publishVerificationDecided(input: {
  userId: string;
  verificationId: string;
  decision: "approved" | "returned" | "rejected";
  reason: string | null;
}): Promise<void> {
  if (!rabbit) return;

  const payload: VerificationDecidedEvent = {
    type: EVENT_VERIFICATION_DECIDED,
    userId: input.userId,
    verificationId: input.verificationId,
    decision: input.decision,
    reason: input.reason,
    at: new Date().toISOString(),
  };

  await publishEvent(rabbit, EVENT_VERIFICATION_DECIDED, payload);
}
