import { Router } from "express";
import { z } from "zod";
import { AppError, validate } from "@abiturent/service-kit";
import { requireModerator } from "../auth.js";
import { prisma } from "../db.js";
import { nextPassNumber, releaseSeatAndMaybePromote } from "../seats.js";
import { applicationJson } from "../serializers.js";

export const moderatorRoutes = Router();

const examInclude = { venue: true } as const;

const DecideSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().optional(),
});

const BatchApproveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

moderatorRoutes.get(
  "/moderator/applications",
  ...requireModerator,
  async (req, res, next) => {
    try {
      const statusParam =
        typeof req.query.status === "string" ? req.query.status : "pending";
      const examId =
        typeof req.query.examId === "string" ? req.query.examId : undefined;
      const subjectId =
        typeof req.query.subjectId === "string"
          ? req.query.subjectId
          : undefined;
      const venueId =
        typeof req.query.venueId === "string" ? req.query.venueId : undefined;

      const statusFilter =
        statusParam === "all"
          ? { in: ["pending", "approved", "rejected", "cancelled"] }
          : statusParam;

      const rows = await prisma.application.findMany({
        where: {
          status: statusFilter,
          ...(examId ? { examId } : {}),
          ...(subjectId || venueId
            ? {
                exam: {
                  ...(subjectId ? { subjectId } : {}),
                  ...(venueId ? { venueId } : {}),
                },
              }
            : {}),
        },
        include: { exam: { include: examInclude } },
        orderBy: [{ createdAt: "asc" }],
      });

      const counts = {
        all: await prisma.application.count({
          where: {
            status: { in: ["pending", "approved", "rejected", "cancelled"] },
            ...(examId ? { examId } : {}),
          },
        }),
        pending: await prisma.application.count({
          where: { status: "pending", ...(examId ? { examId } : {}) },
        }),
        approved: await prisma.application.count({
          where: { status: "approved", ...(examId ? { examId } : {}) },
        }),
        rejected: await prisma.application.count({
          where: { status: "rejected", ...(examId ? { examId } : {}) },
        }),
      };

      res.status(200).json({
        items: rows.map(applicationJson),
        counts,
      });
    } catch (err) {
      next(err);
    }
  },
);

moderatorRoutes.post(
  "/moderator/applications/approve-batch",
  ...requireModerator,
  validate(BatchApproveSchema),
  async (req, res, next) => {
    try {
      const body = BatchApproveSchema.parse(req.body);
      const approved = [];

      for (const id of body.ids) {
        const updated = await prisma.$transaction(async (tx) => {
          const row = await tx.application.findUnique({
            where: { id },
            include: { exam: { include: examInclude } },
          });
          if (!row || row.status !== "pending") return null;

          const year = row.exam.startsAt.getFullYear();
          const passNumber = await nextPassNumber(tx, year);
          return tx.application.update({
            where: { id },
            data: {
              status: "approved",
              passNumber,
              rejectReason: null,
            },
            include: { exam: { include: examInclude } },
          });
        });

        if (updated) approved.push(applicationJson(updated));
      }

      res.status(200).json({ items: approved, count: approved.length });
    } catch (err) {
      next(err);
    }
  },
);

moderatorRoutes.get(
  "/moderator/applications/:id",
  ...requireModerator,
  async (req, res, next) => {
    try {
      const row = await prisma.application.findUnique({
        where: { id: String(req.params.id) },
        include: { exam: { include: examInclude } },
      });
      if (!row) throw AppError.notFound("Application not found");
      res.status(200).json(applicationJson(row));
    } catch (err) {
      next(err);
    }
  },
);

moderatorRoutes.post(
  "/moderator/applications/:id/decide",
  ...requireModerator,
  validate(DecideSchema),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const body = DecideSchema.parse(req.body);

      if (body.decision === "rejected" && !body.reason?.trim()) {
        throw AppError.badRequest("Укажите причину отказа");
      }

      const result = await prisma.$transaction(async (tx) => {
        const row = await tx.application.findUnique({
          where: { id },
          include: { exam: { include: examInclude } },
        });
        if (!row) throw AppError.notFound("Application not found");
        if (row.status !== "pending") {
          throw AppError.conflict("Решение уже вынесено");
        }

        if (body.decision === "approved") {
          const year = row.exam.startsAt.getFullYear();
          const passNumber = await nextPassNumber(tx, year);
          const updated = await tx.application.update({
            where: { id },
            data: {
              status: "approved",
              passNumber,
              rejectReason: null,
            },
            include: { exam: { include: examInclude } },
          });
          return { application: updated, promoted: null };
        }

        const updated = await tx.application.update({
          where: { id },
          data: {
            status: "rejected",
            rejectReason: body.reason!.trim(),
            passNumber: null,
          },
          include: { exam: { include: examInclude } },
        });

        const promoted = await releaseSeatAndMaybePromote(tx, row.examId);
        return { application: updated, promoted };
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
