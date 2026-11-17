import { Router } from "express";
import { z } from "zod";
import { validate } from "@abiturent/service-kit";
import { requireAdmin } from "../auth.js";
import { prisma } from "../db.js";
import {
  getOrCreateSystemSettings,
  systemSettingsJson,
} from "../system-settings.js";

export const systemSettingsRoutes = Router();

const PatchSchema = z.object({
  dataMode: z.enum(["production", "demo"]).optional(),
  registrationOpen: z.boolean().optional(),
  ctApplicationsOpen: z.boolean().optional(),
  ocrEnabled: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
});

systemSettingsRoutes.get("/system-settings", async (_req, res, next) => {
  try {
    const row = await getOrCreateSystemSettings();
    res.status(200).json(systemSettingsJson(row));
  } catch (err) {
    next(err);
  }
});

systemSettingsRoutes.get(
  "/admin/system-settings",
  ...requireAdmin,
  async (_req, res, next) => {
    try {
      const row = await getOrCreateSystemSettings();
      res.status(200).json(systemSettingsJson(row));
    } catch (err) {
      next(err);
    }
  },
);

systemSettingsRoutes.patch(
  "/admin/system-settings",
  ...requireAdmin,
  validate(PatchSchema),
  async (req, res, next) => {
    try {
      const body = PatchSchema.parse(req.body);
      await getOrCreateSystemSettings();
      const row = await prisma.systemSettings.update({
        where: { id: "default" },
        data: {
          ...(body.dataMode !== undefined ? { dataMode: body.dataMode } : {}),
          ...(body.registrationOpen !== undefined
            ? { registrationOpen: body.registrationOpen }
            : {}),
          ...(body.ctApplicationsOpen !== undefined
            ? { ctApplicationsOpen: body.ctApplicationsOpen }
            : {}),
          ...(body.ocrEnabled !== undefined
            ? { ocrEnabled: body.ocrEnabled }
            : {}),
          ...(body.maintenanceMode !== undefined
            ? { maintenanceMode: body.maintenanceMode }
            : {}),
        },
      });
      res.status(200).json(systemSettingsJson(row));
    } catch (err) {
      next(err);
    }
  },
);
