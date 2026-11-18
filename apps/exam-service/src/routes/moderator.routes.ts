import { Router } from "express";
import { z } from "zod";
import { AppError, validate } from "@abiturent/service-kit";
import { reportAudit } from "../audit.js";
import { requireModerator } from "../auth.js";
import { prisma } from "../db.js";
import { issuePassPdf } from "../pass-pdf.js";
import {
  nextPassNumber,
  releaseSeatAndMaybePromote,
  tryClaimSeat,
} from "../seats.js";
import {
  publishApplicationApproved,
  publishApplicationRejected,
  publishApplicationSubmitted,
} from "../notify.js";
import {
  ensureCtResultRow,
  retractCtResultIfPublished,
} from "../results-sync.js";
import { applicationJson } from "../serializers.js";

export const moderatorRoutes = Router();

const examInclude = { venue: true } as const;

const DecideSchema = z.object({
  decision: z.enum(["approved", "rejected", "pending"]),
  reason: z.string().optional(),
});

const CT_CHANGEABLE = new Set(["pending", "approved", "rejected"]);

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
      const moderatorId = req.user?.sub || null;
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

        if (!updated) continue;

        await issuePassPdf(updated.id);
        const withPass = await prisma.application.findUnique({
          where: { id: updated.id },
          include: { exam: { include: examInclude } },
        });
        if (withPass) {
          approved.push(applicationJson(withPass));
          await ensureCtResultRow({
            examId: withPass.examId,
            userId: withPass.userId,
            subjectId: withPass.exam.subjectId,
            campaignYear: withPass.exam.startsAt.getFullYear(),
          });
          reportAudit({
            actorId: moderatorId,
            targetId: withPass.userId,
            action: "ct_approved",
            payload: {
              applicationId: withPass.id,
              examId: withPass.examId,
              passNumber: withPass.passNumber,
            },
          });
          await publishApplicationApproved({
            userId: withPass.userId,
            applicationId: withPass.id,
            examId: withPass.examId,
            passNumber: withPass.passNumber,
          });
        }
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
      const moderatorId = req.user?.sub || null;
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
        if (!CT_CHANGEABLE.has(row.status)) {
          throw AppError.badRequest("Статус этой заявки нельзя изменить");
        }

        const prev = row.status;
        const next = body.decision;

        if (
          prev === next &&
          (next !== "rejected" ||
            (body.reason?.trim() || null) === (row.rejectReason || null))
        ) {
          return { application: row, promoted: null, changed: false as const };
        }

        const heldBefore = prev === "pending" || prev === "approved";
        const heldAfter = next === "pending" || next === "approved";

        if (!heldBefore && heldAfter) {
          const claimed = await tryClaimSeat(tx, row.examId);
          if (!claimed) {
            throw AppError.conflict("Нет свободных мест на этот сеанс");
          }
        }

        let promoted = null as Awaited<
          ReturnType<typeof releaseSeatAndMaybePromote>
        >;
        if (heldBefore && !heldAfter) {
          promoted = await releaseSeatAndMaybePromote(tx, row.examId);
        }

        let passNumber = row.passNumber;
        let passStorageKey = row.passStorageKey;
        let rejectReason = row.rejectReason;

        if (next === "approved") {
          rejectReason = null;
          if (!passNumber || prev !== "approved") {
            const year = row.exam.startsAt.getFullYear();
            passNumber = await nextPassNumber(tx, year);
            passStorageKey = null;
          }
        } else if (next === "rejected") {
          rejectReason = body.reason!.trim();
          passNumber = null;
          passStorageKey = null;
        } else {
          rejectReason = null;
          passNumber = null;
          passStorageKey = null;
        }

        const updated = await tx.application.update({
          where: { id },
          data: {
            status: next,
            passNumber,
            passStorageKey,
            rejectReason,
          },
          include: { exam: { include: examInclude } },
        });

        return { application: updated, promoted, changed: true as const };
      });

      if (!result.changed) {
        res.status(200).json({
          application: applicationJson(result.application),
          promoted: null,
        });
        return;
      }

      if (result.application.status === "approved") {
        await ensureCtResultRow({
          examId: result.application.examId,
          userId: result.application.userId,
          subjectId: result.application.exam.subjectId,
          campaignYear: result.application.exam.startsAt.getFullYear(),
        });
        try {
          await issuePassPdf(result.application.id);
        } catch {
          // Status already saved; pass PDF can be regenerated later.
        }
        const withPass = await prisma.application.findUnique({
          where: { id: result.application.id },
          include: { exam: { include: examInclude } },
        });
        const approvedApp = withPass || result.application;
        reportAudit({
          actorId: moderatorId,
          targetId: approvedApp.userId,
          action: "ct_approved",
          payload: {
            applicationId: approvedApp.id,
            examId: approvedApp.examId,
            passNumber: approvedApp.passNumber,
          },
        });
        await publishApplicationApproved({
          userId: approvedApp.userId,
          applicationId: approvedApp.id,
          examId: approvedApp.examId,
          passNumber: approvedApp.passNumber,
        });
        res.status(200).json({
          application: applicationJson(approvedApp),
          promoted: result.promoted
            ? applicationJson(result.promoted)
            : null,
        });
        return;
      }

      if (result.application.status === "rejected") {
        await retractCtResultIfPublished({
          examId: result.application.examId,
          userId: result.application.userId,
        });
        reportAudit({
          actorId: moderatorId,
          targetId: result.application.userId,
          action: "ct_rejected",
          payload: {
            applicationId: result.application.id,
            examId: result.application.examId,
            reason: result.application.rejectReason,
          },
        });
        await publishApplicationRejected({
          userId: result.application.userId,
          applicationId: result.application.id,
          examId: result.application.examId,
          reason: result.application.rejectReason,
        });
      }

      if (result.application.status === "pending") {
        await retractCtResultIfPublished({
          examId: result.application.examId,
          userId: result.application.userId,
        });
        reportAudit({
          actorId: moderatorId,
          targetId: result.application.userId,
          action: "ct_reopened",
          payload: {
            applicationId: result.application.id,
            examId: result.application.examId,
          },
        });
      }

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
