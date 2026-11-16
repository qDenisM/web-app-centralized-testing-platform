import { Router } from "express";
import { z } from "zod";
import { AppError, validate } from "@abiturent/service-kit";
import { requireApplicant } from "../auth.js";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { profileJson } from "../serializers.js";
import {
  buildAttestatStorageKey,
  createPresignedUpload,
  ensureDocumentsBucket,
} from "../storage.js";

export const profilesRoutes = Router();

const profileInclude = {
  verifications: {
    orderBy: { version: "desc" as const },
    take: 1,
  },
};

const ProfileUpdateSchema = z.object({
  birthDate: z.string().nullable().optional(),
  passportSeries: z.string().nullable().optional(),
  passportNumber: z.string().nullable().optional(),
});

const UploadUrlSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
});

const AttestatConfirmSchema = z.object({
  storageKey: z.string().min(1),
  graduateName: z.string().nullable().optional(),
  schoolName: z.string().nullable().optional(),
  attestatAverage: z.number().min(0).max(10).nullable().optional(),
  attestatIssuedOn: z.string().nullable().optional(),
});

const AttestatOcrSchema = z.object({
  storageKey: z.string().min(1),
});

async function getOrCreateProfile(userId: string) {
  const existing = await prisma.applicantProfile.findUnique({
    where: { userId },
    include: profileInclude,
  });
  if (existing) return existing;

  return prisma.applicantProfile.create({
    data: {
      userId,
      verifications: {
        create: {
          version: 1,
          status: "draft",
        },
      },
    },
    include: profileInclude,
  });
}

profilesRoutes.get(
  "/profile/me",
  ...requireApplicant,
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();
      const profile = await getOrCreateProfile(userId);
      res.status(200).json(profileJson(profile));
    } catch (err) {
      next(err);
    }
  },
);

profilesRoutes.put(
  "/profile/me",
  ...requireApplicant,
  validate(ProfileUpdateSchema),
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();
      const body = ProfileUpdateSchema.parse(req.body);
      await getOrCreateProfile(userId);

      const profile = await prisma.applicantProfile.update({
        where: { userId },
        data: {
          ...(body.birthDate !== undefined
            ? {
                birthDate: body.birthDate ? new Date(body.birthDate) : null,
              }
            : {}),
          ...(body.passportSeries !== undefined
            ? { passportSeries: body.passportSeries }
            : {}),
          ...(body.passportNumber !== undefined
            ? { passportNumber: body.passportNumber }
            : {}),
        },
        include: profileInclude,
      });

      res.status(200).json(profileJson(profile));
    } catch (err) {
      next(err);
    }
  },
);

profilesRoutes.post(
  "/profile/me/attestat/upload-url",
  ...requireApplicant,
  validate(UploadUrlSchema),
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();
      const body = UploadUrlSchema.parse(req.body);

      const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];
      if (!allowed.includes(body.contentType)) {
        throw AppError.badRequest("Разрешены JPG, PNG, WEBP или PDF");
      }

      await getOrCreateProfile(userId);
      await ensureDocumentsBucket();

      const storageKey = buildAttestatStorageKey(userId, body.fileName);
      const signed = await createPresignedUpload({
        storageKey,
        contentType: body.contentType,
      });

      res.status(200).json(signed);
    } catch (err) {
      next(err);
    }
  },
);

profilesRoutes.post(
  "/profile/me/attestat/confirm",
  ...requireApplicant,
  validate(AttestatConfirmSchema),
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();
      const body = AttestatConfirmSchema.parse(req.body);

      if (!body.storageKey.startsWith(`attestats/${userId}/`)) {
        throw AppError.badRequest("Некорректный ключ файла");
      }

      await getOrCreateProfile(userId);

      const profile = await prisma.applicantProfile.update({
        where: { userId },
        data: {
          storageKey: body.storageKey,
          ...(body.graduateName !== undefined
            ? { graduateName: body.graduateName }
            : {}),
          ...(body.schoolName !== undefined
            ? { schoolName: body.schoolName }
            : {}),
          ...(body.attestatAverage !== undefined
            ? { attestatAverage: body.attestatAverage }
            : {}),
          ...(body.attestatIssuedOn !== undefined
            ? {
                attestatIssuedOn: body.attestatIssuedOn
                  ? new Date(body.attestatIssuedOn)
                  : null,
              }
            : {}),
        },
        include: profileInclude,
      });

      res.status(200).json(profileJson(profile));
    } catch (err) {
      next(err);
    }
  },
);

profilesRoutes.post(
  "/profile/me/attestat/ocr",
  ...requireApplicant,
  validate(AttestatOcrSchema),
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();
      const body = AttestatOcrSchema.parse(req.body);

      if (!body.storageKey.startsWith(`attestats/${userId}/`)) {
        throw AppError.badRequest("Некорректный ключ файла");
      }

      const aiRes = await fetch(`${config.aiUrl}/ocr/attestat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ storageKey: body.storageKey }),
      });

      if (!aiRes.ok) {
        const text = await aiRes.text();
        throw AppError.badRequest(text || "OCR-сервис временно недоступен");
      }

      const data = (await aiRes.json()) as {
        graduateName: string;
        schoolName: string;
        attestatAverage: number;
        attestatIssuedOn: string;
        lowConfidenceFields: string[];
      };

      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);
