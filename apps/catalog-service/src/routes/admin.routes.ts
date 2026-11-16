import { Router } from "express";
import { requireAdmin } from "../auth.js";
import { prisma } from "../db.js";

export const adminRoutes = Router();

adminRoutes.get(
  "/admin/stats",
  ...requireAdmin,
  async (_req, res, next) => {
    try {
      const [
        institutions,
        specialties,
        subjects,
        campaigns,
        passingScores,
      ] = await Promise.all([
        prisma.institution.count(),
        prisma.specialty.count(),
        prisma.subject.count(),
        prisma.campaign.count(),
        prisma.passingScore.count(),
      ]);

      res.status(200).json({
        institutions,
        specialties,
        subjects,
        campaigns,
        passingScores,
      });
    } catch (err) {
      next(err);
    }
  },
);