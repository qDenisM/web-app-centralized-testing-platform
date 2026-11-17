import { Router } from "express";
import { z } from "zod";
import { validate } from "@abiturent/service-kit";
import { requireAdmin } from "../auth.js";
import { prisma } from "../db.js";
import { getOrCreateSettings, getSettingsDto } from "../settings.js";

export const settingsRoutes = Router();

const PatchSchema = z.object({
  allEnabled: z.boolean().optional(),
  verificationEnabled: z.boolean().optional(),
  applicationEnabled: z.boolean().optional(),
  resultEnabled: z.boolean().optional(),
});

settingsRoutes.get(
  "/admin/notification-settings",
  ...requireAdmin,
  async (_req, res, next) => {
    try {
      res.status(200).json(await getSettingsDto());
    } catch (err) {
      next(err);
    }
  },
);

settingsRoutes.patch(
  "/admin/notification-settings",
  ...requireAdmin,
  validate(PatchSchema),
  async (req, res, next) => {
    try {
      const body = PatchSchema.parse(req.body);
      await getOrCreateSettings();
      const row = await prisma.notificationSettings.update({
        where: { id: "default" },
        data: {
          ...(body.allEnabled !== undefined
            ? { allEnabled: body.allEnabled }
            : {}),
          ...(body.verificationEnabled !== undefined
            ? { verificationEnabled: body.verificationEnabled }
            : {}),
          ...(body.applicationEnabled !== undefined
            ? { applicationEnabled: body.applicationEnabled }
            : {}),
          ...(body.resultEnabled !== undefined
            ? { resultEnabled: body.resultEnabled }
            : {}),
        },
      });
      res.status(200).json({
        allEnabled: row.allEnabled,
        verificationEnabled: row.verificationEnabled,
        applicationEnabled: row.applicationEnabled,
        resultEnabled: row.resultEnabled,
        updatedAt: row.updatedAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);
