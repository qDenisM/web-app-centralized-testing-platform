import { Router } from "express";
import { z } from "zod";
import { AppError, validate } from "@abiturent/service-kit";
import { requireAdmin } from "../auth.js";
import { prisma } from "../db.js";
import { specialtyJson } from "../serializers.js";

export const specialtiesRoutes = Router();

const SpecialtyBodySchema = z.object({
  institutionId: z.string().uuid(),
  okrbCode: z.string().min(1),
  name: z.string().min(1),
  studyForm: z.string().min(1),
  funding: z.string().min(1),
  placesPlan: z.number().int().nonnegative(),
  contentMode: z.string().min(1),
  isPublished: z.boolean().optional(),
});

const specialtyInclude = {
  institution: true,
  specialtySubjects: { include: { subject: true }, orderBy: { slot: "asc" as const } },
  passingScores: { orderBy: { year: "desc" as const } },
};

specialtiesRoutes.get("/specialties", async (req, res, next) => {
  try {
    const institutionId =
      typeof req.query.institutionId === "string"
        ? req.query.institutionId
        : undefined;

    const rows = await prisma.specialty.findMany({
      where: {
        isPublished: true,
        ...(institutionId ? { institutionId } : {}),
      },
      include: specialtyInclude,
      orderBy: { name: "asc" },
    });
    res.status(200).json(rows.map(specialtyJson));
  } catch (err) {
    next(err);
  }
});

specialtiesRoutes.get("/specialties/:id", async (req, res, next) => {
  try {
    const row = await prisma.specialty.findUnique({
      where: { id: String(req.params.id) },
      include: specialtyInclude,
    });
    if (!row || !row.isPublished) {
      throw AppError.notFound("Specialty not found");
    }
    res.status(200).json(specialtyJson(row));
  } catch (err) {
    next(err);
  }
});

specialtiesRoutes.get(
  "/admin/specialties",
  ...requireAdmin,
  async (req, res, next) => {
    try {
      const institutionId =
        typeof req.query.institutionId === "string"
          ? req.query.institutionId
          : undefined;
      const rows = await prisma.specialty.findMany({
        where: institutionId ? { institutionId } : undefined,
        include: specialtyInclude,
        orderBy: { name: "asc" },
      });
      res.status(200).json(rows.map(specialtyJson));
    } catch (err) {
      next(err);
    }
  },
);

specialtiesRoutes.post(
  "/admin/specialties",
  ...requireAdmin,
  validate(SpecialtyBodySchema),
  async (req, res, next) => {
    try {
      const body = SpecialtyBodySchema.parse(req.body);
      const institution = await prisma.institution.findUnique({
        where: { id: body.institutionId },
      });
      if (!institution) {
        throw AppError.badRequest("Institution not found");
      }
      const row = await prisma.specialty.create({
        data: {
          institutionId: body.institutionId,
          okrbCode: body.okrbCode,
          name: body.name,
          studyForm: body.studyForm,
          funding: body.funding,
          placesPlan: body.placesPlan,
          contentMode: body.contentMode,
          isPublished: body.isPublished ?? false,
        },
        include: specialtyInclude,
      });
      res.status(201).json(specialtyJson(row));
    } catch (err) {
      next(err);
    }
  },
);

specialtiesRoutes.patch(
  "/admin/specialties/:id",
  ...requireAdmin,
  validate(SpecialtyBodySchema.partial()),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const body = SpecialtyBodySchema.partial().parse(req.body);
      const existing = await prisma.specialty.findUnique({ where: { id } });
      if (!existing) {
        throw AppError.notFound("Specialty not found");
      }
      if (body.institutionId) {
        const institution = await prisma.institution.findUnique({
          where: { id: body.institutionId },
        });
        if (!institution) {
          throw AppError.badRequest("Institution not found");
        }
      }
      const row = await prisma.specialty.update({
        where: { id },
        data: body,
        include: specialtyInclude,
      });
      res.status(200).json(specialtyJson(row));
    } catch (err) {
      next(err);
    }
  },
);

specialtiesRoutes.delete(
  "/admin/specialties/:id",
  ...requireAdmin,
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const existing = await prisma.specialty.findUnique({ where: { id } });
      if (!existing) {
        throw AppError.notFound("Specialty not found");
      }
      await prisma.specialty.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

const SpecialtySubjectBodySchema = z.object({
  subjectId: z.string().uuid(),
  slot: z.number().int().positive(),
  minScore: z.number().int().nonnegative().optional(),
});

specialtiesRoutes.post(
  "/admin/specialties/:id/subjects",
  ...requireAdmin,
  validate(SpecialtySubjectBodySchema),
  async (req, res, next) => {
    try {
      const specialtyId = String(req.params.id);
      const body = SpecialtySubjectBodySchema.parse(req.body);
      const specialty = await prisma.specialty.findUnique({
        where: { id: specialtyId },
      });
      if (!specialty) {
        throw AppError.notFound("Specialty not found");
      }
      const subject = await prisma.subject.findUnique({
        where: { id: body.subjectId },
      });
      if (!subject) {
        throw AppError.badRequest("Subject not found");
      }
      await prisma.specialtySubject.create({
        data: {
          specialtyId,
          subjectId: body.subjectId,
          slot: body.slot,
          minScore: body.minScore ?? 0,
        },
      });
      const row = await prisma.specialty.findUnique({
        where: { id: specialtyId },
        include: specialtyInclude,
      });
      res.status(201).json(specialtyJson(row!));
    } catch (err) {
      next(err);
    }
  },
);

specialtiesRoutes.delete(
  "/admin/specialties/:specialtyId/subjects/:id",
  ...requireAdmin,
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const existing = await prisma.specialtySubject.findUnique({
        where: { id },
      });
      if (!existing) {
        throw AppError.notFound("Specialty subject not found");
      }
      await prisma.specialtySubject.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

const PassingScoreBodySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  score: z.number().int().nonnegative(),
  competition: z.number().nonnegative().nullable().optional(),
});

specialtiesRoutes.post(
  "/admin/specialties/:id/passing-scores",
  ...requireAdmin,
  validate(PassingScoreBodySchema),
  async (req, res, next) => {
    try {
      const specialtyId = String(req.params.id);
      const body = PassingScoreBodySchema.parse(req.body);
      const specialty = await prisma.specialty.findUnique({
        where: { id: specialtyId },
      });
      if (!specialty) {
        throw AppError.notFound("Specialty not found");
      }
      await prisma.passingScore.create({
        data: {
          specialtyId,
          year: body.year,
          score: body.score,
          competition: body.competition ?? null,
        },
      });
      const row = await prisma.specialty.findUnique({
        where: { id: specialtyId },
        include: specialtyInclude,
      });
      res.status(201).json(specialtyJson(row!));
    } catch (err) {
      next(err);
    }
  },
);

specialtiesRoutes.delete(
  "/admin/specialties/:specialtyId/passing-scores/:id",
  ...requireAdmin,
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const existing = await prisma.passingScore.findUnique({ where: { id } });
      if (!existing) {
        throw AppError.notFound("Passing score not found");
      }
      await prisma.passingScore.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
