import { Router } from "express";
import {
  BlockUserRequestSchema,
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
