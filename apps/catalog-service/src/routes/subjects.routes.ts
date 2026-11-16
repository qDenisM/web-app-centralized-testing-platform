import { Router } from "express";
import { z } from "zod";
import { AppError, validate } from "@abiturent/service-kit";
import { requireAdmin } from "../auth.js";
import { prisma } from "../db.js";
import { subjectJson } from "../serializers.js";

export const subjectsRoutes = Router();

const SubjectBodySchema = z.object({
  name: z.string().min(1),
  shortCode: z.string().min(1),
  status: z.string().min(1).optional(),
});

subjectsRoutes.get("/subjects", async (_req, res, next) => {
  try {
    const rows = await prisma.subject.findMany({
      orderBy: { name: "asc" },
    });
    res.status(200).json(rows.map(subjectJson));
  } catch (err) {
    next(err);
  }
});

subjectsRoutes.get("/subjects/:id", async (req, res, next) => {
  try {
    const row = await prisma.subject.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!row) {
      throw AppError.notFound("Subject not found");
    }
    res.status(200).json(subjectJson(row));
  } catch (err) {
    next(err);
  }
});

subjectsRoutes.post(
  "/admin/subjects",
  ...requireAdmin,
  validate(SubjectBodySchema),
  async (req, res, next) => {
    try {
      const body = SubjectBodySchema.parse(req.body);
      const row = await prisma.subject.create({
        data: {
          name: body.name,
          shortCode: body.shortCode,
          status: body.status ?? "active",
        },
      });
      res.status(201).json(subjectJson(row));
    } catch (err) {
      next(err);
    }
  },
);

subjectsRoutes.patch(
  "/admin/subjects/:id",
  ...requireAdmin,
  validate(SubjectBodySchema.partial()),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const body = SubjectBodySchema.partial().parse(req.body);
      const existing = await prisma.subject.findUnique({ where: { id } });
      if (!existing) {
        throw AppError.notFound("Subject not found");
      }
      const row = await prisma.subject.update({
        where: { id },
        data: body,
      });
      res.status(200).json(subjectJson(row));
    } catch (err) {
      next(err);
    }
  },
);

subjectsRoutes.delete(
  "/admin/subjects/:id",
  ...requireAdmin,
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const existing = await prisma.subject.findUnique({ where: { id } });
      if (!existing) {
        throw AppError.notFound("Subject not found");
      }
      await prisma.subject.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
