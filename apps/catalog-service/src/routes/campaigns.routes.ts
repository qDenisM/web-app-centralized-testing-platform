import { Router } from "express";
import { z } from "zod";
import { AppError, validate } from "@abiturent/service-kit";
import { requireAdmin } from "../auth.js";
import { prisma } from "../db.js";
import { campaignJson, campaignStageJson } from "../serializers.js";

export const campaignsRoutes = Router();

const CampaignBodySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  isActive: z.boolean().optional(),
});

const CampaignStageBodySchema = z.object({
  sortOrder: z.number().int().positive(),
  name: z.string().min(1),
  startsOn: z.string().min(1),
  endsOn: z.string().min(1),
});

const campaignInclude = {
  stages: { orderBy: { sortOrder: "asc" as const } },
};

campaignsRoutes.get("/campaigns", async (_req, res, next) => {
  try {
    const rows = await prisma.campaign.findMany({
      include: campaignInclude,
      orderBy: { year: "desc" },
    });
    res.status(200).json(rows.map(campaignJson));
  } catch (err) {
    next(err);
  }
});

campaignsRoutes.get("/campaigns/active", async (_req, res, next) => {
  try {
    const row = await prisma.campaign.findFirst({
      where: { isActive: true },
      include: campaignInclude,
    });
    if (!row) {
      throw AppError.notFound("Active campaign not found");
    }
    res.status(200).json(campaignJson(row));
  } catch (err) {
    next(err);
  }
});

campaignsRoutes.get("/campaigns/:id", async (req, res, next) => {
  try {
    const row = await prisma.campaign.findUnique({
      where: { id: String(req.params.id) },
      include: campaignInclude,
    });
    if (!row) {
      throw AppError.notFound("Campaign not found");
    }
    res.status(200).json(campaignJson(row));
  } catch (err) {
    next(err);
  }
});

campaignsRoutes.post(
  "/admin/campaigns",
  ...requireAdmin,
  validate(CampaignBodySchema),
  async (req, res, next) => {
    try {
      const body = CampaignBodySchema.parse(req.body);
      if (body.isActive) {
        await prisma.campaign.updateMany({
          data: { isActive: false },
        });
      }
      const row = await prisma.campaign.create({
        data: {
          year: body.year,
          isActive: body.isActive ?? false,
        },
        include: campaignInclude,
      });
      res.status(201).json(campaignJson(row));
    } catch (err) {
      next(err);
    }
  },
);

campaignsRoutes.patch(
  "/admin/campaigns/:id",
  ...requireAdmin,
  validate(CampaignBodySchema.partial()),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const body = CampaignBodySchema.partial().parse(req.body);
      const existing = await prisma.campaign.findUnique({ where: { id } });
      if (!existing) {
        throw AppError.notFound("Campaign not found");
      }
      if (body.isActive) {
        await prisma.campaign.updateMany({
          where: { id: { not: id } },
          data: { isActive: false },
        });
      }
      const row = await prisma.campaign.update({
        where: { id },
        data: body,
        include: campaignInclude,
      });
      res.status(200).json(campaignJson(row));
    } catch (err) {
      next(err);
    }
  },
);

campaignsRoutes.delete(
  "/admin/campaigns/:id",
  ...requireAdmin,
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const existing = await prisma.campaign.findUnique({ where: { id } });
      if (!existing) {
        throw AppError.notFound("Campaign not found");
      }
      await prisma.campaign.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

campaignsRoutes.post(
  "/admin/campaigns/:id/stages",
  ...requireAdmin,
  validate(CampaignStageBodySchema),
  async (req, res, next) => {
    try {
      const campaignId = String(req.params.id);
      const body = CampaignStageBodySchema.parse(req.body);
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
      });
      if (!campaign) {
        throw AppError.notFound("Campaign not found");
      }
      const stage = await prisma.campaignStage.create({
        data: {
          campaignId,
          sortOrder: body.sortOrder,
          name: body.name,
          startsOn: new Date(body.startsOn),
          endsOn: new Date(body.endsOn),
        },
      });
      res.status(201).json(campaignStageJson(stage));
    } catch (err) {
      next(err);
    }
  },
);

campaignsRoutes.patch(
  "/admin/campaign-stages/:id",
  ...requireAdmin,
  validate(CampaignStageBodySchema.partial()),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const body = CampaignStageBodySchema.partial().parse(req.body);
      const existing = await prisma.campaignStage.findUnique({ where: { id } });
      if (!existing) {
        throw AppError.notFound("Campaign stage not found");
      }
      const stage = await prisma.campaignStage.update({
        where: { id },
        data: {
          ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.startsOn !== undefined
            ? { startsOn: new Date(body.startsOn) }
            : {}),
          ...(body.endsOn !== undefined ? { endsOn: new Date(body.endsOn) } : {}),
        },
      });
      res.status(200).json(campaignStageJson(stage));
    } catch (err) {
      next(err);
    }
  },
);

campaignsRoutes.delete(
  "/admin/campaign-stages/:id",
  ...requireAdmin,
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const existing = await prisma.campaignStage.findUnique({ where: { id } });
      if (!existing) {
        throw AppError.notFound("Campaign stage not found");
      }
      await prisma.campaignStage.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
