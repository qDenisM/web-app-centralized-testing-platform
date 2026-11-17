import { Router } from "express";
import { requireAdmin } from "../auth.js";
import { prisma } from "../db.js";

export const adminRoutes = Router();

adminRoutes.get(
  "/admin/stats",
  ...requireAdmin,
  async (_req, res, next) => {
    try {
      const activeCampaign = await prisma.campaign.findFirst({
        where: { isActive: true },
        orderBy: { year: "desc" },
      });
      const year = activeCampaign?.year ?? new Date().getFullYear();

      const [
        institutions,
        institutionsUniversity,
        institutionsCollege,
        institutionsPublished,
        specialties,
        specialtiesBudget,
        specialtiesPaid,
        subjects,
        campaigns,
        passingScores,
        specialtiesMissing,
        missingCount,
      ] = await Promise.all([
        prisma.institution.count(),
        prisma.institution.count({ where: { type: "university" } }),
        prisma.institution.count({ where: { type: "college" } }),
        prisma.institution.count({ where: { isPublished: true } }),
        prisma.specialty.count(),
        prisma.specialty.count({ where: { funding: "budget" } }),
        prisma.specialty.count({ where: { funding: "paid" } }),
        prisma.subject.count(),
        prisma.campaign.count(),
        prisma.passingScore.count(),
        prisma.specialty.findMany({
          where: { passingScores: { none: { year } } },
          take: 5,
          orderBy: { name: "asc" },
          include: {
            institution: { select: { shortName: true } },
          },
        }),
        prisma.specialty.count({
          where: { passingScores: { none: { year } } },
        }),
      ]);

      res.status(200).json({
        institutions,
        institutionsUniversity,
        institutionsCollege,
        institutionsPublished,
        institutionsHidden: Math.max(0, institutions - institutionsPublished),
        specialties,
        specialtiesBudget,
        specialtiesPaid,
        specialtiesWithoutPassingScore: missingCount,
        specialtiesWithoutPassingScoreSamples: specialtiesMissing.map((s) => ({
          id: s.id,
          name: s.name,
          institutionShortName: s.institution?.shortName || null,
        })),
        subjects,
        campaigns,
        passingScores,
        activeCampaignYear: year,
      });
    } catch (err) {
      next(err);
    }
  },
);
