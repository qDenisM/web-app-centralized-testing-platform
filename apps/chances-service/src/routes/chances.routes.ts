import { Router } from "express";
import { z } from "zod";
import { AppError } from "@abiturent/service-kit";
import { requireApplicant } from "../auth.js";
import {
  buildScoresBySubject,
  evaluateChance,
  type CatalogSpecialty,
} from "../calculate.js";
import { prisma } from "../db.js";
import { chanceResultJson } from "../serializers.js";
import {
  fetchApplicantProfile,
  fetchCatalogSpecialties,
  fetchExamSubjectMap,
  fetchPublishedResults,
} from "../upstream.js";

export const chancesRoutes = Router();

const CalculateSchema = z.object({
  specialtyIds: z.array(z.string().uuid()).optional(),
  allSpecialties: z.boolean().optional(),
});

chancesRoutes.get("/chances/me", ...requireApplicant, async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    if (!userId) throw AppError.unauthorized();

    const rows = await prisma.chanceResult.findMany({
      where: { userId },
      orderBy: { calculatedAt: "desc" },
    });

    res.status(200).json(rows.map(chanceResultJson));
  } catch (err) {
    next(err);
  }
});

chancesRoutes.post("/chances/calculate", ...requireApplicant, async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();

      const authHeader = req.headers.authorization;
      if (!authHeader) throw AppError.unauthorized();

      const body = CalculateSchema.parse(req.body ?? {});

      const [catalog, profile, results, examMap] = await Promise.all([
        fetchCatalogSpecialties(),
        fetchApplicantProfile(authHeader),
        fetchPublishedResults(authHeader),
        fetchExamSubjectMap(),
      ]);

      const catalogById = new Map<string, CatalogSpecialty>();
      for (const item of catalog) {
        catalogById.set(item.id, item);
      }

      let targetIds: string[] = [];
      if (body.allSpecialties) {
        targetIds = catalog.map((s) => s.id);
      } else if (body.specialtyIds && body.specialtyIds.length > 0) {
        targetIds = body.specialtyIds;
      } else {
        const favorites = await prisma.favorite.findMany({
          where: { userId },
          select: { specialtyId: true },
        });
        targetIds = favorites.map((f) => f.specialtyId);
      }

      if (targetIds.length === 0) {
        res.status(200).json([]);
        return;
      }

      const scoresBySubject = buildScoresBySubject(results, examMap);
      const calculatedAt = new Date();
      const saved = [];

      for (const specialtyId of targetIds) {
        const specialty = catalogById.get(specialtyId);
        if (!specialty) continue;

        const outcome = evaluateChance({
          specialty,
          attestatAverage: profile.attestatAverage,
          scoresBySubject,
        });

        const row = await prisma.chanceResult.upsert({
          where: {
            userId_specialtyId: { userId, specialtyId },
          },
          create: {
            userId,
            specialtyId,
            status: outcome.status,
            probability: outcome.probability,
            scoreGap: outcome.scoreGap,
            calculatedAt,
          },
          update: {
            status: outcome.status,
            probability: outcome.probability,
            scoreGap: outcome.scoreGap,
            calculatedAt,
          },
        });

        saved.push(chanceResultJson(row));
      }

      res.status(200).json(saved);
    } catch (err) {
      next(err);
    }
  },
);