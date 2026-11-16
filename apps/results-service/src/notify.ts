import {
  EVENT_RESULT_PUBLISHED,
  type ResultPublishedEvent,
} from "@abiturent/contracts";
import { publishEvent, type RabbitClient } from "@abiturent/service-kit";

let rabbit: RabbitClient | null = null;

export function setRabbitClient(client: RabbitClient | null) {
  rabbit = client;
}

export async function publishResultPublished(input: {
  userId: string;
  resultId: string;
  examId: string;
  score: number;
}): Promise<void> {
  if (!rabbit) return;

  const payload: ResultPublishedEvent = {
    type: EVENT_RESULT_PUBLISHED,
    userId: input.userId,
    resultId: input.resultId,
    examId: input.examId,
    score: input.score,
    at: new Date().toISOString(),
  };

  await publishEvent(rabbit, EVENT_RESULT_PUBLISHED, payload);
}
