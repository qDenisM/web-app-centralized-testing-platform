import {
  closeRabbit,
  connectRabbit,
  type RabbitClient,
} from "@abiturent/service-kit";
import { buildApp } from "./app.js";
import { config } from "./config.js";
import { startResultsConsumers } from "./consumer.js";
import { prisma } from "./db.js";
import { setRabbitClient } from "./notify.js";

const { app, logger } = buildApp();
let rabbit: RabbitClient | null = null;

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, "results-service listening");

  void connectRabbit(config.rabbitmqUrl)
    .then(async (client) => {
      rabbit = client;
      setRabbitClient(client);
      await startResultsConsumers(client);
      logger.info("rabbitmq connected");
    })
    .catch((err: unknown) => {
      logger.error({ err }, "rabbitmq connect failed");
    });
});

async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  server.close();
  setRabbitClient(null);
  await closeRabbit(rabbit);
  rabbit = null;
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
