import { Router } from "express";
import { AppError } from "@abiturent/service-kit";
import { requireModerator } from "../auth.js";
import { prisma } from "../db.js";
import { verificationQueueJson } from "../serializers.js";

export const moderatorRoutes = Router();

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
      const row = await prisma.verification.findUnique({
        where: { id: String(req.params.id) },
        include: { profile: true },
      });
      if (!row) {
        throw AppError.notFound("Verification not found");
      }
      res.status(200).json(verificationQueueJson(row));
    } catch (err) {
      next(err);
    }
  },
);
