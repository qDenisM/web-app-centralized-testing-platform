import { Router } from "express";
import { z } from "zod";
import { AppError, validate } from "@abiturent/service-kit";
import { reportAudit } from "../audit.js";
import { requireApplicant } from "../auth.js";
import { prisma } from "../db.js";
import { favoriteJson } from "../serializers.js";

export const favoritesRoutes = Router();

const FavoriteBodySchema = z.object({
  specialtyId: z.string().uuid(),
});

favoritesRoutes.get(
  "/favorites",
  ...requireApplicant,
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();

      const rows = await prisma.favorite.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json(rows.map(favoriteJson));
    } catch (err) {
      next(err);
    }
  },
);

favoritesRoutes.post(
  "/favorites",
  ...requireApplicant,
  validate(FavoriteBodySchema),
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();
      const body = FavoriteBodySchema.parse(req.body);

      const row = await prisma.favorite.upsert({
        where: {
          userId_specialtyId: {
            userId,
            specialtyId: body.specialtyId,
          },
        },
        create: {
          userId,
          specialtyId: body.specialtyId,
        },
        update: {},
      });

      reportAudit({
        actorId: userId,
        targetId: userId,
        action: "favorite_add",
        payload: { specialtyId: body.specialtyId },
      });

      res.status(201).json(favoriteJson(row));
    } catch (err) {
      next(err);
    }
  },
);

favoritesRoutes.delete(
  "/favorites/:specialtyId",
  ...requireApplicant,
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();
      const specialtyId = String(req.params.specialtyId);

      const row = await prisma.favorite.findUnique({
        where: {
          userId_specialtyId: { userId, specialtyId },
        },
      });
      if (!row) {
        throw AppError.notFound("Favorite not found");
      }

      await prisma.favorite.delete({
        where: { id: row.id },
      });

      reportAudit({
        actorId: userId,
        targetId: userId,
        action: "favorite_remove",
        payload: { specialtyId },
      });

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);