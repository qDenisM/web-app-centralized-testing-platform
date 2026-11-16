import amqp, {
  type Channel,
  type ChannelModel,
  type ConsumeMessage,
} from "amqplib";
import { RABBIT_EXCHANGE } from "@abiturent/contracts";

export type RabbitClient = {
  connection: ChannelModel;
  channel: Channel;
  exchange: string;
};

export async function connectRabbit(url: string): Promise<RabbitClient> {
  const connection = await amqp.connect(url);
  const channel = await connection.createChannel();
  await channel.assertExchange(RABBIT_EXCHANGE, "topic", { durable: true });
  return { connection, channel, exchange: RABBIT_EXCHANGE };
}

/** Direct publish to RabbitMQ (no outbox / at-least-once retry on the producer side). */
export async function publishEvent(
  client: RabbitClient,
  routingKey: string,
  payload: unknown,
): Promise<void> {
  client.channel.publish(
    client.exchange,
    routingKey,
    Buffer.from(JSON.stringify(payload)),
    {
      persistent: true,
      contentType: "application/json",
    },
  );
}

export async function consumeEvents(
  client: RabbitClient,
  options: {
    queue: string;
    routingKey: string;
    onMessage: (payload: unknown, raw: ConsumeMessage) => Promise<void>;
  },
): Promise<void> {
  await client.channel.assertQueue(options.queue, { durable: true });
  await client.channel.bindQueue(
    options.queue,
    client.exchange,
    options.routingKey,
  );
  await client.channel.prefetch(1);

  await client.channel.consume(options.queue, (msg) => {
    if (!msg) return;

    void (async () => {
      try {
        const payload = JSON.parse(msg.content.toString("utf8")) as unknown;
        await options.onMessage(payload, msg);
        client.channel.ack(msg);
      } catch {
        client.channel.nack(msg, false, false);
      }
    })();
  });
}

export async function closeRabbit(client: RabbitClient | null): Promise<void> {
  if (!client) return;
  await client.channel.close().catch(() => undefined);
  await client.connection.close().catch(() => undefined);
}
