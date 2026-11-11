import type { ErrorRequestHandler, RequestHandler } from "express";
import type { Logger } from "pino";
import { ZodError } from "zod";
import { AppError } from "./errors.js";

export function notFoundHandler(): RequestHandler {
  return (_req, res) => {
    res.status(404).json({
      error: "Route not found",
      code: "NOT_FOUND",
    });
  };
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    if (err instanceof AppError) {
      if (err.status >= 500) {
        logger.error({ err }, err.message);
      } else {
        logger.warn({ err, details: err.details }, err.message);
      }

      res.status(err.status).json({
        error: err.message,
        code: err.code,
        details: err.details,
      });
      return;
    }

    if (err instanceof ZodError) {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: err.flatten(),
      });
      return;
    }

    logger.error({ err }, "Unhandled error");
    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  };
}
