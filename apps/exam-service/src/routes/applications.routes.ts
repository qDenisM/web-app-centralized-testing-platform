import { Router } from "express";
import { AppError } from "@abiturent/service-kit";
import { reportAudit } from "../audit.js";
import { requireApplicant, requireModerator } from "../auth.js";
import { prisma } from "../db.js";
import { publishApplicationSubmitted } from "../notify.js";
import { releaseSeatAndMaybePromote } from "../seats.js";
import { applicationJson, waitlistJson } from "../serializers.js";
import { createPassDownloadUrl } from "../storage.js";

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
          data: {
            status: "cancelled",
            passNumber: null,
            passStorageKey: null,
          },
          include: { exam: { include: examInclude } },
        });

        if (!heldSeat) {
          return { application: cancelled, promoted: null };
        }

        const promoted = await releaseSeatAndMaybePromote(tx, app.examId);
        return { application: cancelled, promoted };
      });

      reportAudit({
        actorId: userId,
        targetId: userId,
        action: "ct_cancel",
        payload: {
          applicationId: result.application.id,
          examId: result.application.examId,
        },
      });

      if (result.promoted) {
        await publishApplicationSubmitted({
          userId: result.promoted.userId,
          applicationId: result.promoted.id,
          examId: result.promoted.examId,
        });
      }

      res.status(200).json({
        application: applicationJson(result.application),
        promoted: result.promoted ? applicationJson(result.promoted) : null,
      });
    } catch (err) {
      next(err);
    }
  },
);

applicationsRoutes.get(
  "/applications/:id/pass",
  ...requireApplicant,
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();
      const id = String(req.params.id);

      const row = await prisma.application.findUnique({ where: { id } });
      if (!row || row.userId !== userId) {
        throw AppError.notFound("Application not found");
      }
      if (row.status !== "approved" || !row.passStorageKey) {
        throw AppError.badRequest("Пропуск ещё не готов");
      }

      const link = await createPassDownloadUrl(row.passStorageKey);
      res.status(200).json({
        passNumber: row.passNumber,
        storageKey: row.passStorageKey,
        ...link,
      });
    } catch (err) {
      next(err);
    }
  },
);

applicationsRoutes.get(
  "/moderator/applications/:id/pass",
  ...requireModerator,
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const row = await prisma.application.findUnique({ where: { id } });
      if (!row) throw AppError.notFound("Application not found");
      if (row.status !== "approved" || !row.passStorageKey) {
        throw AppError.badRequest("Пропуск ещё не готов");
      }

      const link = await createPassDownloadUrl(row.passStorageKey);
      res.status(200).json({
        passNumber: row.passNumber,
        storageKey: row.passStorageKey,
        ...link,
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

      reportAudit({
        actorId: userId,
        targetId: userId,
        action: "ct_waitlist_cancel",
        payload: { waitlistId: updated.id, examId: updated.examId },
      });

      res.status(200).json(waitlistJson(updated));
    } catch (err) {
      next(err);
    }
  },
);
