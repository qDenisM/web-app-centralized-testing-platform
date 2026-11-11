import { buildApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";

const { app, logger } = buildApp();

const server = app.listen(config.port, () => {
  logger.info(
    { port: config.port },
    "identity-service listening",
  );
});

async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
