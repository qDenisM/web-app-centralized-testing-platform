import { Router } from "express";
import {
  BlockUserRequestSchema,
  PatchUserRoleRequestSchema,
  RoleSchema,
} from "@abiturent/contracts";
import { AppError, validate } from "@abiturent/service-kit";
import { prisma } from "../db.js";
import { writeAudit } from "../audit.js";
import {
  authenticateLocal,
  requireRole,
} from "../auth-middleware.js";

export const usersRoutes = Router();

function userAdminJson(user: {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  status: string;
  blockedReason: string | null;
  blockedUntil: Date | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: RoleSchema.parse(user.role),
    status: user.status,
    blockedReason: user.blockedReason,
    blockedUntil: user.blockedUntil?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

usersRoutes.get(
  "/users/me",
  authenticateLocal(),
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        throw AppError.unauthorized();
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw AppError.notFound("User not found");
      }

      res.status(200).json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: RoleSchema.parse(user.role),
        status: user.status,
        createdAt: user.createdAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

usersRoutes.post(
  "/users/:id/block",
  authenticateLocal(),
  requireRole("admin"),
  validate(BlockUserRequestSchema),
  async (req, res, next) => {
    try {
      const targetId = String(req.params.id);
      const adminId = req.user?.sub;
      if (!adminId) {
        throw AppError.unauthorized();
      }

      const body = BlockUserRequestSchema.parse(req.body);

      if (targetId === adminId) {
        throw AppError.badRequest("Cannot block yourself");
      }

      const target = await prisma.user.findUnique({ where: { id: targetId } });
      if (!target) {
        throw AppError.notFound("User not found");
      }

      if (target.status === "blocked") {
        throw AppError.conflict("User already blocked");
      }

      const blockedUntil = body.blockedUntil
        ? new Date(body.blockedUntil)
        : null;

      const updated = await prisma.user.update({
        where: { id: targetId },
        data: {
          status: "blocked",
          blockedReason: body.reason,
          blockedUntil,
        },
      });

      // Отзываем все активные сессии заблокированного пользователя.
      await prisma.session.updateMany({
        where: { userId: targetId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await writeAudit({
        actorId: adminId,
        targetId,
        action: "block_user",
        payload: {
          reason: body.reason,
          blockedUntil: blockedUntil?.toISOString() ?? null,
        },
      });

      res.status(200).json({
        id: updated.id,
        email: updated.email,
        status: updated.status,
        blockedReason: updated.blockedReason,
        blockedUntil: updated.blockedUntil?.toISOString() ?? null,
      });
    } catch (err) {
      next(err);
    }
  },
);

usersRoutes.get(
  "/admin/users",
  authenticateLocal(),
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const role =
        typeof req.query.role === "string" ? req.query.role.trim() : "";
      const status =
        typeof req.query.status === "string" ? req.query.status.trim() : "";

      const where: {
        OR?: Array<
          | { email: { contains: string; mode: "insensitive" } }
          | { fullName: { contains: string; mode: "insensitive" } }
        >;
        role?: string;
        status?: string;
      } = {};

      if (q) {
        where.OR = [
          { email: { contains: q, mode: "insensitive" } },
          { fullName: { contains: q, mode: "insensitive" } },
        ];
      }
      if (role) {
        where.role = RoleSchema.parse(role);
      }
      if (status) {
        where.status = status;
      }

      const rows = await prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json({ items: rows.map(userAdminJson) });
    } catch (err) {
      next(err);
    }
  },
);

usersRoutes.get(
  "/admin/stats",
  authenticateLocal(),
  requireRole("admin"),
  async (_req, res, next) => {
    try {
      const [usersTotal, usersActive, usersBlocked, roleRows] = await Promise.all(
        [
          prisma.user.count(),
          prisma.user.count({ where: { status: "active" } }),
          prisma.user.count({ where: { status: "blocked" } }),
          prisma.user.groupBy({
            by: ["role"],
            _count: { _all: true },
          }),
        ],
      );

      const byRole: Record<string, number> = {};
      for (const row of roleRows) {
        byRole[row.role] = row._count._all;
      }

      res.status(200).json({
        usersTotal,
        usersActive,
        usersBlocked,
        byRole,
      });
    } catch (err) {
      next(err);
    }
  },
);

usersRoutes.patch(
  "/admin/users/:id/role",
  authenticateLocal(),
  requireRole("admin"),
  validate(PatchUserRoleRequestSchema),
  async (req, res, next) => {
    try {
      const targetId = String(req.params.id);
      const adminId = req.user?.sub;
      if (!adminId) {
        throw AppError.unauthorized();
      }

      if (targetId === adminId) {
        throw AppError.badRequest("Cannot change your own role");
      }

      const body = PatchUserRoleRequestSchema.parse(req.body);
      const target = await prisma.user.findUnique({ where: { id: targetId } });
      if (!target) {
        throw AppError.notFound("User not found");
      }

      const updated = await prisma.user.update({
        where: { id: targetId },
        data: { role: body.role },
      });

      await writeAudit({
        actorId: adminId,
        targetId,
        action: "change_user_role",
        payload: { from: target.role, to: body.role },
      });

      res.status(200).json(userAdminJson(updated));
    } catch (err) {
      next(err);
    }
  },
);

usersRoutes.post(
  "/admin/users/:id/unblock",
  authenticateLocal(),
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const targetId = String(req.params.id);
      const adminId = req.user?.sub;
      if (!adminId) {
        throw AppError.unauthorized();
      }

      const target = await prisma.user.findUnique({ where: { id: targetId } });
      if (!target) {
        throw AppError.notFound("User not found");
      }

      if (target.status !== "blocked") {
        throw AppError.conflict("User is not blocked");
      }

      const updated = await prisma.user.update({
        where: { id: targetId },
        data: {
          status: "active",
          blockedReason: null,
          blockedUntil: null,
        },
      });

      await writeAudit({
        actorId: adminId,
        targetId,
        action: "unblock_user",
        payload: {},
      });

      res.status(200).json(userAdminJson(updated));
    } catch (err) {
      next(err);
    }
  },
);
