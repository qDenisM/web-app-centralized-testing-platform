import {
  EVENT_APPLICATION_APPROVED,
  EVENT_APPLICATION_REJECTED,
  type ApplicationApprovedEvent,
  type ApplicationRejectedEvent,
} from "@abiturent/contracts";
import { consumeEvents, type RabbitClient } from "@abiturent/service-kit";
import {
  ensureResultRow,
  retractPublishedResult,
} from "./result-rows.js";

function isApplicationApproved(
  payload: unknown,
): payload is ApplicationApprovedEvent {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as { type?: string }).type === EVENT_APPLICATION_APPROVED
  );
}

function isApplicationRejected(
  payload: unknown,
): payload is ApplicationRejectedEvent {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as { type?: string }).type === EVENT_APPLICATION_REJECTED
  );
}

/** Keep ct_results in sync with CT admission decisions. */
export async function startResultsConsumers(client: RabbitClient) {
  await consumeEvents(client, {
    queue: "results.application.approved",
    routingKey: EVENT_APPLICATION_APPROVED,
    onMessage: async (payload) => {
      if (!isApplicationApproved(payload)) return;
      await ensureResultRow({
        examId: payload.examId,
        userId: payload.userId,
      });
    },
  });

  await consumeEvents(client, {
    queue: "results.application.rejected",
    routingKey: EVENT_APPLICATION_REJECTED,
    onMessage: async (payload) => {
      if (!isApplicationRejected(payload)) return;
      await retractPublishedResult({
        examId: payload.examId,
        userId: payload.userId,
      });
    },
  });
}
