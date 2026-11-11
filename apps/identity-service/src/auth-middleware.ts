import type { NextFunction, Request, RequestHandler, Response } from "express";
import { requireRole, type AuthErrorBody } from "@abiturent/auth";
import { verifyAccessToken } from "./tokens.js";

export { requireRole };

export function authenticateLocal(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const header = req.header("authorization");
      if (!header) {
        const body: AuthErrorBody = {
          error: "Missing Bearer token",
          code: "UNAUTHORIZED",
        };
        res.status(401).json(body);
        return;
      }

      const [scheme, token] = header.split(" ");
      if (scheme?.toLowerCase() !== "bearer" || !token) {
        const body: AuthErrorBody = {
          error: "Missing Bearer token",
          code: "UNAUTHORIZED",
        };
        res.status(401).json(body);
        return;
      }

      req.user = await verifyAccessToken(token);
      next();
    } catch {
      const body: AuthErrorBody = {
        error: "Invalid or expired token",
        code: "UNAUTHORIZED",
      };
      res.status(401).json(body);
    }
  };
}

export function clientIp(req: Request): string | null {
  const forwarded = req.header("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return req.ip || null;
}
