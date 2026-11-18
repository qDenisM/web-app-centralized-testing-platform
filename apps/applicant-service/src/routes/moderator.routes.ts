import { Router } from "express";
import { z } from "zod";
import { AppError, validate } from "@abiturent/service-kit";
import { reportAudit } from "../audit.js";
import { requireModerator } from "../auth.js";
import { prisma } from "../db.js";
import {
  applicantBriefFromMap,
  lookupIdentityUsers,
} from "../identity.js";
import { publishVerificationDecided } from "../notify.js";
import { verificationQueueJson } from "../serializers.js";
import { createAttestatDownloadUrl } from "../storage.js";

export const moderatorRoutes = Router();

type VerificationWithProfile = Parameters<typeof verificationQueueJson>[0];

const DecideSchema = z.object({
  decision: z.enum(["approved", "returned", "rejected", "pending"]),
  reason: z.string().optional(),
});

const DECIDABLE_STATUSES = new Set([
  "pending",
  "approved",
  "returned",
  "rejected",
]);

async function serializeVerification(row: VerificationWithProfile) {
  const users = await lookupIdentityUsers([row.profile.userId]);
  return verificationQueueJson(
    row,
    applicantBriefFromMap(row.profile.userId, users),
  );
}

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

      const users = await lookupIdentityUsers(
        rows.map((row) => row.profile.userId),
      );

      let items = rows.map((row) =>
        verificationQueueJson(
          row,
          applicantBriefFromMap(row.profile.userId, users),
        ),
      );

      if (q) {
        items = items.filter((item) => {
          const hay = [
            item.applicant.fullName,
            item.applicant.email,
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

      const payload = await serializeVerification(row);
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
        res.status(200).json(await serializeVerification(row));
        return;
      }

      if (!row.lockedBy) {
        res.status(200).json(await serializeVerification(row));
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

      res.status(200).json(await serializeVerification(updated));
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

      if (!DECIDABLE_STATUSES.has(row.status)) {
        throw AppError.badRequest("Эту заявку нельзя изменить");
      }

      // Pending cards are locked to one moderator; decided cards can be reopened/changed.
      if (
        row.status === "pending" &&
        row.lockedBy &&
        row.lockedBy !== moderatorId
      ) {
        throw AppError.forbidden("Заявку проверяет другой модератор");
      }

      if (
        (body.decision === "returned" || body.decision === "rejected") &&
        !body.reason?.trim()
      ) {
        throw AppError.badRequest("Укажите причину");
      }

      if (row.status === body.decision) {
        if (
          body.decision === "pending" ||
          body.decision === "approved" ||
          (body.reason?.trim() || null) === (row.rejectReason || null)
        ) {
          res.status(200).json(await serializeVerification(row));
          return;
        }
      }

      const rejectReason =
        body.decision === "approved" || body.decision === "pending"
          ? null
          : body.reason!.trim();

      const updated = await prisma.verification.update({
        where: { id },
        data: {
          status: body.decision,
          rejectReason,
          // Keep lock on reopen so the same moderator can finish re-review.
          lockedBy: moderatorId,
          decidedAt: body.decision === "pending" ? null : new Date(),
        },
        include: { profile: true },
      });

      const auditAction =
        body.decision === "approved"
          ? "verification_approved"
          : body.decision === "returned"
            ? "verification_returned"
            : body.decision === "rejected"
              ? "verification_rejected"
              : "verification_reopened";

      reportAudit({
        actorId: moderatorId,
        targetId: updated.profile.userId,
        action: auditAction,
        payload: {
          verificationId: updated.id,
          fromStatus: row.status,
          toStatus: body.decision,
          reason: rejectReason,
        },
      });

      await publishVerificationDecided({
        userId: updated.profile.userId,
        verificationId: updated.id,
        decision: body.decision,
        reason: rejectReason,
      });

      res.status(200).json(await serializeVerification(updated));
    } catch (err) {
      next(err);
    }
  },
);
