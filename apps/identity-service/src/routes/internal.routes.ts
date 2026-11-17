import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { AppError, validate } from "@abiturent/service-kit";
import { writeAudit } from "../audit.js";
import { config } from "../config.js";

export const internalRoutes = Router();

const AuditIngestSchema = z.object({
  actorId: z.string().uuid().nullable().optional(),
  targetId: z.string().uuid().nullable().optional(),
  action: z.string().min(1).max(80),
  payload: z.record(z.string(), z.unknown()).optional(),
});

internalRoutes.post(
  "/internal/audit",
  validate(AuditIngestSchema),
  async (req, res, next) => {
    try {
      const token = String(req.header("x-internal-token") || "");
      if (!token || token !== config.internalAuditToken) {
        throw AppError.unauthorized("Invalid internal token");
      }

      const body = AuditIngestSchema.parse(req.body);
      await writeAudit({
        actorId: body.actorId ?? null,
        targetId: body.targetId ?? null,
        action: body.action,
        payload: (body.payload ?? {}) as Prisma.InputJsonValue,
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
