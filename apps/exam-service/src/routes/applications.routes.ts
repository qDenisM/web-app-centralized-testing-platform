import { Router } from "express";
import { AppError } from "@abiturent/service-kit";
import { requireApplicant } from "../auth.js";
import { prisma } from "../db.js";
import { releaseSeatAndMaybePromote } from "../seats.js";
import { applicationJson, waitlistJson } from "../serializers.js";

export const applicationsRoutes = Router();

const examInclude = { venue: true } as const;

applicationsRoutes.get(
  "/applications/me",
  ...requireApplicant,
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();

      const rows = await prisma.application.findMany({
        where: { userId },
        include: { exam: { include: examInclude } },
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json(rows.map(applicationJson));
    } catch (err) {
      next(err);
    }
  },
);

applicationsRoutes.get(
  "/waitlist/me",
  ...requireApplicant,
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();

      const rows = await prisma.waitlistEntry.findMany({
        where: { userId, status: "waiting" },
        include: { exam: { include: examInclude } },
        orderBy: { position: "asc" },
      });

      res.status(200).json(rows.map(waitlistJson));
    } catch (err) {
      next(err);
    }
  },
);

applicationsRoutes.post(
  "/applications/:id/cancel",
  ...requireApplicant,
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();
      const id = String(req.params.id);

      const result = await prisma.$transaction(async (tx) => {
        const app = await tx.application.findUnique({
          where: { id },
          include: { exam: { include: examInclude } },
        });
        if (!app || app.userId !== userId) {
          throw AppError.notFound("Application not found");
        }
        if (app.status === "cancelled") {
          throw AppError.badRequest("Заявка уже отменена");
        }
        if (app.status === "rejected") {
          throw AppError.badRequest("Отклонённую заявку нельзя отменить");
        }

        const heldSeat = app.status === "pending" || app.status === "approved";

        const cancelled = await tx.application.update({
          where: { id },
          data: { status: "cancelled", passNumber: null },
          include: { exam: { include: examInclude } },
        });

        if (!heldSeat) {
          return { application: cancelled, promoted: null };
        }

        const promoted = await releaseSeatAndMaybePromote(tx, app.examId);
        return { application: cancelled, promoted };
      });

      res.status(200).json({
        application: applicationJson(result.application),
        promoted: result.promoted ? applicationJson(result.promoted) : null,
      });
    } catch (err) {
      next(err);
    }
  },
);

applicationsRoutes.post(
  "/waitlist/:id/cancel",
  ...requireApplicant,
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();
      const id = String(req.params.id);

      const row = await prisma.waitlistEntry.findUnique({ where: { id } });
      if (!row || row.userId !== userId) {
        throw AppError.notFound("Waitlist entry not found");
      }
      if (row.status !== "waiting") {
        throw AppError.badRequest("Запись в листе ожидания уже не активна");
      }

      const updated = await prisma.waitlistEntry.update({
        where: { id },
        data: { status: "cancelled" },
        include: { exam: { include: examInclude } },
      });

      res.status(200).json(waitlistJson(updated));
    } catch (err) {
      next(err);
    }
  },
);
