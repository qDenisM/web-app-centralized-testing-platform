import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { AppError, validate } from "@abiturent/service-kit";
import { writeAudit } from "../audit.js";
import { config } from "../config.js";
import { prisma } from "../db.js";

export const internalRoutes = Router();

function requireInternalToken(req: { header: (name: string) => string | undefined }) {
  const token = String(req.header("x-internal-token") || "");
  if (!token || token !== config.internalAuditToken) {
    throw AppError.unauthorized("Invalid internal token");
  }
}

const AuditIngestSchema = z.object({
  actorId: z.string().uuid().nullable().optional(),
  targetId: z.string().uuid().nullable().optional(),
  action: z.string().min(1).max(80),
  payload: z.record(z.string(), z.unknown()).optional(),
});

const UsersLookupSchema = z.object({
  ids: z.array(z.string().uuid()).max(500),
});

const UsersByRoleSchema = z.object({
  roles: z.array(z.string().min(1).max(32)).min(1).max(10),
});

internalRoutes.post(
  "/internal/audit",
  validate(AuditIngestSchema),
  async (req, res, next) => {
    try {
      requireInternalToken(req);

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

/** Batch lookup for service-to-service enrichment (moderator queues, passes). */
internalRoutes.post(
  "/internal/users/lookup",
  validate(UsersLookupSchema),
  async (req, res, next) => {
    try {
      requireInternalToken(req);

      const body = UsersLookupSchema.parse(req.body);
      const ids = [...new Set(body.ids)];
      if (ids.length === 0) {
        res.status(200).json({ users: [] });
        return;
      }

      const rows = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, email: true, fullName: true },
      });

      res.status(200).json({
        users: rows.map((row) => ({
          id: row.id,
          email: row.email,
          fullName: row.fullName,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

/** List users by role for notification fan-out (e.g. all moderators). */
internalRoutes.post(
  "/internal/users/by-role",
  validate(UsersByRoleSchema),
  async (req, res, next) => {
    try {
      requireInternalToken(req);

      const body = UsersByRoleSchema.parse(req.body);
      const roles = [...new Set(body.roles)];

      const rows = await prisma.user.findMany({
        where: { role: { in: roles } },
        select: { id: true, email: true, fullName: true, role: true },
        orderBy: { email: "asc" },
        take: 1000,
      });

      res.status(200).json({
        users: rows.map((row) => ({
          id: row.id,
          email: row.email,
          fullName: row.fullName,
          role: row.role,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);
