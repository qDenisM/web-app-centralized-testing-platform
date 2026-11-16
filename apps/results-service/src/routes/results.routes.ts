import { Router } from "express";
import { AppError } from "@abiturent/service-kit";
import { requireApplicant } from "../auth.js";
import { prisma } from "../db.js";
import { resultJson } from "../serializers.js";

export const resultsRoutes = Router();

resultsRoutes.get("/results/me", ...requireApplicant, async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    if (!userId) throw AppError.unauthorized();

    const rows = await prisma.ctResult.findMany({
      where: { userId, status: "published" },
      orderBy: { publishedAt: "desc" },
    });

    res.status(200).json(rows.map(resultJson));
  } catch (err) {
    next(err);
  }
});
