import pino, { type Logger, type LoggerOptions } from "pino";

export type CreateLoggerOptions = {
  service: string;
  level?: string;
  pretty?: boolean;
};

export function createLogger(options: CreateLoggerOptions): Logger {
  const level = options.level ?? process.env.LOG_LEVEL ?? "info";

  const config: LoggerOptions = {
    level,
    base: { service: options.service },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (options.pretty ?? process.env.NODE_ENV !== "production") {
    return pino({
      ...config,
      transport: {
        target: "pino/file",
        options: { destination: 1 },
      },
    });
  }

  return pino(config);
}
