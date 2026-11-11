import express, {
  type Express,
  type Request,
  type RequestHandler,
  type Router,
} from "express";
import helmet from "helmet";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";
import { createLogger } from "./logger.js";
import { errorHandler, notFoundHandler } from "./error-handler.js";

export type CreateAppOptions = {
  serviceName: string;
  routes?: Router | RequestHandler;
  logLevel?: string;
  logger?: Logger;
};

export type CreatedApp = {
  app: Express;
  logger: Logger;
};

export function createApp(options: CreateAppOptions): CreatedApp {
  const logger =
    options.logger ??
    createLogger({
      service: options.serviceName,
      level: options.logLevel,
    });

  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req: Request) => req.url === "/health",
      },
    }),
  );

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: options.serviceName,
      timestamp: new Date().toISOString(),
    });
  });

  if (options.routes) {
    app.use(options.routes);
  }

  app.use(notFoundHandler());
  app.use(errorHandler(logger));

  return { app, logger };
}
