import {
  closeRabbit,
  connectRabbit,
  type RabbitClient,
} from "@abiturent/service-kit";
import { buildApp } from "./app.js";
import { config } from "./config.js";
import { startNotificationConsumers } from "./consumer.js";
import { prisma } from "./db.js";

const { app, logger } = buildApp();
let rabbit: RabbitClient | null = null;

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, "notification-service listening");

  void connectRabbit(config.rabbitmqUrl)
    .then(async (client) => {
      rabbit = client;
      await startNotificationConsumers(client);
      logger.info("rabbitmq consumer started");
    })
    .catch((err: unknown) => {
      logger.error({ err }, "rabbitmq connect failed");
    });
});

async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  server.close();
  await closeRabbit(rabbit);
  rabbit = null;
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
