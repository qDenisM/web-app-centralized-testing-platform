import { Router } from "express";
import { z } from "zod";
import { AppError, validate } from "@abiturent/service-kit";
import { requireUser } from "../auth.js";
import { prisma } from "../db.js";

export const notificationsRoutes = Router();

const CreateSchema = z.object({
  userId: z.string().uuid(),
  channel: z.string().min(1).optional(),
  title: z.string().min(1),
  body: z.string().min(1),
});

function notificationJson(row: {
  id: string;
  userId: string;
  channel: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
}) {
  return {
    id: row.id,
    userId: row.userId,
    channel: row.channel,
    title: row.title,
    body: row.body,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  };
}

notificationsRoutes.post(
  "/notifications",
  validate(CreateSchema),
  async (req, res, next) => {
    try {
      const body = CreateSchema.parse(req.body);
      const row = await prisma.notification.create({
        data: {
          userId: body.userId,
          channel: body.channel ?? "in_app",
          title: body.title,
          body: body.body,
        },
      });
      res.status(201).json(notificationJson(row));
    } catch (err) {
      next(err);
    }
  },
);

notificationsRoutes.get(
  "/notifications/me",
  ...requireUser,
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();

      const rows = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      res.status(200).json(rows.map(notificationJson));
    } catch (err) {
      next(err);
    }
  },
);

notificationsRoutes.post(
  "/notifications/:id/read",
  ...requireUser,
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();
      const id = String(req.params.id);

      const row = await prisma.notification.findUnique({ where: { id } });
      if (!row || row.userId !== userId) {
        throw AppError.notFound("Notification not found");
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });

      res.status(200).json(notificationJson(updated));
    } catch (err) {
      next(err);
    }
  },
);
