import { buildApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { ensureDocumentsBucket } from "./storage.js";

const { app, logger } = buildApp();

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, "applicant-service listening");
  void ensureDocumentsBucket()
    .then(() => {
      logger.info(
        { bucket: config.minio.documentsBucket },
        "minio bucket ready",
      );
    })
    .catch((err: unknown) => {
      logger.error({ err }, "minio bucket init failed");
    });
});

async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
