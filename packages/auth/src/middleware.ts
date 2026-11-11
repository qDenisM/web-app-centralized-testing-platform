import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Role } from "@abiturent/contracts";
import { verifyJwt, type VerifyJwtOptions } from "./verify-jwt.js";

export type AuthErrorBody = {
  error: string;
  code: "UNAUTHORIZED" | "FORBIDDEN";
};

function extractBearer(req: Request): string | null {
  const header = req.header("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

/** Middleware: читает Bearer JWT, кладёт payload в `req.user`. */
export function authenticate(options: VerifyJwtOptions): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractBearer(req);
      if (!token) {
        const body: AuthErrorBody = {
          error: "Missing Bearer token",
          code: "UNAUTHORIZED",
        };
        res.status(401).json(body);
        return;
      }

      req.user = await verifyJwt(token, options);
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

/**
 * Проверка роли после `authenticate`.
 * Пример: `requireRole("admin", "moderator")`
 */
export function requireRole(...roles: Role[]): RequestHandler {
  const allowed = new Set(roles);

  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      const body: AuthErrorBody = {
        error: "Authentication required",
        code: "UNAUTHORIZED",
      };
      res.status(401).json(body);
      return;
    }

    if (!allowed.has(user.role)) {
      const body: AuthErrorBody = {
        error: "Insufficient role",
        code: "FORBIDDEN",
      };
      res.status(403).json(body);
      return;
    }

    next();
  };
}
