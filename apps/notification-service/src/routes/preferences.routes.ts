import { Router } from "express";
import { z } from "zod";
import { AppError, validate } from "@abiturent/service-kit";
import { requireUser } from "../auth.js";
import { prisma } from "../db.js";
import {
  getOrCreatePreferences,
  getPreferencesDto,
  parseDefaultQueueTab,
} from "../preferences.js";

export const preferencesRoutes = Router();

const PatchSchema = z.object({
  allEnabled: z.boolean().optional(),
  verificationQueue: z.boolean().optional(),
  ctApplications: z.boolean().optional(),
  decisions: z.boolean().optional(),
  resultsPublish: z.boolean().optional(),
  resultsImport: z.boolean().optional(),
  examAssignments: z.boolean().optional(),
  defaultQueueTab: z
    .enum(["overview", "docs", "applications", "history"])
    .optional(),
});

preferencesRoutes.get(
  "/notification-preferences/me",
  ...requireUser,
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();
      res.status(200).json(await getPreferencesDto(userId));
    } catch (err) {
      next(err);
    }
  },
);

preferencesRoutes.patch(
  "/notification-preferences/me",
  ...requireUser,
  validate(PatchSchema),
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();
      const body = PatchSchema.parse(req.body);

      await getOrCreatePreferences(userId);
      const row = await prisma.notificationPreferences.update({
        where: { userId },
        data: {
          ...(body.allEnabled !== undefined
            ? { allEnabled: body.allEnabled }
            : {}),
          ...(body.verificationQueue !== undefined
            ? { verificationQueue: body.verificationQueue }
            : {}),
          ...(body.ctApplications !== undefined
            ? { ctApplications: body.ctApplications }
            : {}),
          ...(body.decisions !== undefined
            ? { decisions: body.decisions }
            : {}),
          ...(body.resultsPublish !== undefined
            ? { resultsPublish: body.resultsPublish }
            : {}),
          ...(body.resultsImport !== undefined
            ? { resultsImport: body.resultsImport }
            : {}),
          ...(body.examAssignments !== undefined
            ? { examAssignments: body.examAssignments }
            : {}),
          ...(body.defaultQueueTab !== undefined
            ? {
                defaultQueueTab: parseDefaultQueueTab(body.defaultQueueTab),
              }
            : {}),
        },
      });

      res.status(200).json({
        userId: row.userId,
        allEnabled: row.allEnabled,
        verificationQueue: row.verificationQueue,
        ctApplications: row.ctApplications,
        decisions: row.decisions,
        resultsPublish: row.resultsPublish,
        resultsImport: row.resultsImport,
        examAssignments: row.examAssignments,
        defaultQueueTab: parseDefaultQueueTab(row.defaultQueueTab),
        updatedAt: row.updatedAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);
