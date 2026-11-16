import { Router } from "express";
import { z } from "zod";
import { AppError, validate } from "@abiturent/service-kit";
import { requireAdmin } from "../auth.js";
import { prisma } from "../db.js";
import { institutionJson } from "../serializers.js";

export const institutionsRoutes = Router();

const InstitutionBodySchema = z.object({
  type: z.string().min(1),
  shortName: z.string().min(1),
  fullName: z.string().min(1),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
});

institutionsRoutes.get("/institutions", async (_req, res, next) => {
  try {
    const rows = await prisma.institution.findMany({
      where: { isPublished: true },
      orderBy: { shortName: "asc" },
    });
    res.status(200).json(rows.map(institutionJson));
  } catch (err) {
    next(err);
  }
});

institutionsRoutes.get("/institutions/:id", async (req, res, next) => {
  try {
    const row = await prisma.institution.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!row || !row.isPublished) {
      throw AppError.notFound("Institution not found");
    }
    res.status(200).json(institutionJson(row));
  } catch (err) {
    next(err);
  }
});

institutionsRoutes.get(
  "/admin/institutions",
  ...requireAdmin,
  async (_req, res, next) => {
    try {
      const rows = await prisma.institution.findMany({
        orderBy: { shortName: "asc" },
      });
      res.status(200).json(rows.map(institutionJson));
    } catch (err) {
      next(err);
    }
  },
);

institutionsRoutes.post(
  "/admin/institutions",
  ...requireAdmin,
  validate(InstitutionBodySchema),
  async (req, res, next) => {
    try {
      const body = InstitutionBodySchema.parse(req.body);
      const row = await prisma.institution.create({
        data: {
          type: body.type,
          shortName: body.shortName,
          fullName: body.fullName,
          address: body.address ?? null,
          city: body.city ?? null,
          isPublished: body.isPublished ?? false,
        },
      });
      res.status(201).json(institutionJson(row));
    } catch (err) {
      next(err);
    }
  },
);

institutionsRoutes.patch(
  "/admin/institutions/:id",
  ...requireAdmin,
  validate(InstitutionBodySchema.partial()),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const body = InstitutionBodySchema.partial().parse(req.body);
      const existing = await prisma.institution.findUnique({ where: { id } });
      if (!existing) {
        throw AppError.notFound("Institution not found");
      }
      const row = await prisma.institution.update({
        where: { id },
        data: body,
      });
      res.status(200).json(institutionJson(row));
    } catch (err) {
      next(err);
    }
  },
);

institutionsRoutes.delete(
  "/admin/institutions/:id",
  ...requireAdmin,
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const existing = await prisma.institution.findUnique({ where: { id } });
      if (!existing) {
        throw AppError.notFound("Institution not found");
      }
      await prisma.institution.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
