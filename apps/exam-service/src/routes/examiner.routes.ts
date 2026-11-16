import { Router } from "express";
import { requireExaminer } from "../auth.js";
import { prisma } from "../db.js";
import { applicationJson, examJson } from "../serializers.js";

export const examinerRoutes = Router();

const examInclude = { venue: true } as const;

examinerRoutes.get("/examiner/exams", ...requireExaminer, async (_req, res, next) => {
  try {
    const rows = await prisma.exam.findMany({
      include: examInclude,
      orderBy: { startsAt: "asc" },
    });
    res.status(200).json(rows.map(examJson));
  } catch (err) {
    next(err);
  }
});

examinerRoutes.get(
  "/examiner/applications",
  ...requireExaminer,
  async (req, res, next) => {
    try {
      const examId =
        typeof req.query.examId === "string" ? req.query.examId : undefined;
      const status =
        typeof req.query.status === "string" ? req.query.status : "approved";

      const rows = await prisma.application.findMany({
        where: {
          status,
          ...(examId ? { examId } : {}),
        },
        include: { exam: { include: examInclude } },
        orderBy: { createdAt: "asc" },
      });

      res.status(200).json({ items: rows.map(applicationJson) });
    } catch (err) {
      next(err);
    }
  },
);
