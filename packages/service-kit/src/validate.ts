import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodTypeAny } from "zod";
import { AppError } from "./errors.js";

type RequestPart = "body" | "query" | "params";

export function validate(
  schema: ZodTypeAny,
  part: RequestPart = "body",
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[part]);
    if (!parsed.success) {
      next(AppError.validation("Validation failed", parsed.error.flatten()));
      return;
    }

    (req as Request & Record<RequestPart, unknown>)[part] = parsed.data;
    next();
  };
}
