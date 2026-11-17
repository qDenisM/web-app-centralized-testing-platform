import { Router } from "express";
import { z } from "zod";
import { AppError, validate } from "@abiturent/service-kit";
import { reportAudit } from "../audit.js";
import { requireModerator } from "../auth.js";
import { prisma } from "../db.js";
import { publishVerificationDecided } from "../notify.js";
import { verificationQueueJson } from "../serializers.js";
import { createAttestatDownloadUrl } from "../storage.js";

export const moderatorRoutes = Router();

const DecideSchema = z.object({
  decision: z.enum(["approved", "returned", "rejected"]),
  reason: z.string().optional(),
});

moderatorRoutes.get(
  "/moderator/verifications",
  ...requireModerator,
  async (req, res, next) => {
    try {
      const statusParam =
        typeof req.query.status === "string" ? req.query.status : "pending";
      const q =
        typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";

      const statusFilter =
        statusParam === "all"
          ? { in: ["pending", "returned", "rejected", "approved"] }
          : statusParam;

      const rows = await prisma.verification.findMany({
        where: {
          status: statusFilter,
          submittedAt: { not: null },
        },
        include: { profile: true },
        orderBy: [{ submittedAt: "asc" }],
      });

      let items = rows.map(verificationQueueJson);

      if (q) {
        items = items.filter((item) => {
          const hay = [
            item.profile.graduateName,
            item.profile.schoolName,
            item.profile.passportSeries,
            item.profile.passportNumber,
            item.profile.userId,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        });
      }

      const counts = {
        all: await prisma.verification.count({
          where: {
            submittedAt: { not: null },
            status: { in: ["pending", "returned", "rejected", "approved"] },
          },
        }),
        pending: await prisma.verification.count({
          where: { status: "pending", submittedAt: { not: null } },
        }),
        returned: await prisma.verification.count({
          where: { status: "returned", submittedAt: { not: null } },
        }),
        rejected: await prisma.verification.count({
          where: { status: "rejected", submittedAt: { not: null } },
        }),
      };

      res.status(200).json({ items, counts });
    } catch (err) {
      next(err);
    }
  },
);

moderatorRoutes.get(
  "/moderator/verifications/:id",
  ...requireModerator,
  async (req, res, next) => {
    try {
      const moderatorId = req.user?.sub;
      if (!moderatorId) throw AppError.unauthorized();

      let row = await prisma.verification.findUnique({
        where: { id: String(req.params.id) },
        include: { profile: true },
      });
      if (!row) {
        throw AppError.notFound("Verification not found");
      }

      if (
        row.status === "pending" &&
        (!row.lockedBy || row.lockedBy === moderatorId)
      ) {
        row = await prisma.verification.update({
          where: { id: row.id },
          data: { lockedBy: moderatorId },
          include: { profile: true },
        });
      }

      const payload = verificationQueueJson(row);
      let attestatScanUrl: string | null = null;
      if (row.profile.storageKey) {
        const link = await createAttestatDownloadUrl(row.profile.storageKey);
        attestatScanUrl = link.downloadUrl;
      }

      res.status(200).json({ ...payload, attestatScanUrl });
    } catch (err) {
      next(err);
    }
  },
);

moderatorRoutes.post(
  "/moderator/verifications/:id/unlock",
  ...requireModerator,
  async (req, res, next) => {
    try {
      const moderatorId = req.user?.sub;
      if (!moderatorId) throw AppError.unauthorized();

      const id = String(req.params.id);
      const row = await prisma.verification.findUnique({
        where: { id },
        include: { profile: true },
      });
      if (!row) {
        throw AppError.notFound("Verification not found");
      }

      if (row.status !== "pending") {
        res.status(200).json(verificationQueueJson(row));
        return;
      }

      if (!row.lockedBy) {
        res.status(200).json(verificationQueueJson(row));
        return;
      }

      if (row.lockedBy !== moderatorId) {
        throw AppError.forbidden("Заявку проверяет другой модератор");
      }

      const updated = await prisma.verification.update({
        where: { id },
        data: { lockedBy: null },
        include: { profile: true },
      });

      res.status(200).json(verificationQueueJson(updated));
    } catch (err) {
      next(err);
    }
  },
);

moderatorRoutes.post(
  "/moderator/verifications/:id/decide",
  ...requireModerator,
  validate(DecideSchema),
  async (req, res, next) => {
    try {
      const moderatorId = req.user?.sub;
      if (!moderatorId) throw AppError.unauthorized();

      const id = String(req.params.id);
      const body = DecideSchema.parse(req.body);

      const row = await prisma.verification.findUnique({
        where: { id },
        include: { profile: true },
      });
      if (!row) {
        throw AppError.notFound("Verification not found");
      }

      if (row.status !== "pending") {
        throw AppError.conflict("Решение уже вынесено");
      }

      if (row.lockedBy && row.lockedBy !== moderatorId) {
        throw AppError.forbidden("Заявку проверяет другой модератор");
      }

      if (
        (body.decision === "returned" || body.decision === "rejected") &&
        !body.reason?.trim()
      ) {
        throw AppError.badRequest("Укажите причину");
      }

      const rejectReason =
        body.decision === "approved" ? null : body.reason!.trim();

      const updated = await prisma.verification.update({
        where: { id },
        data: {
          status: body.decision,
          rejectReason,
          lockedBy: moderatorId,
          decidedAt: new Date(),
        },
        include: { profile: true },
      });

      reportAudit({
        actorId: moderatorId,
        targetId: updated.profile.userId,
        action:
          body.decision === "approved"
            ? "verification_approved"
            : body.decision === "returned"
              ? "verification_returned"
              : "verification_rejected",
        payload: {
          verificationId: updated.id,
          reason: rejectReason,
        },
      });

      await publishVerificationDecided({
        userId: updated.profile.userId,
        verificationId: updated.id,
        decision: body.decision,
        reason: rejectReason,
      });

      res.status(200).json(verificationQueueJson(updated));
    } catch (err) {
      next(err);
    }
  },
);
