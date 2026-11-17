import { Router } from "express";
import { z } from "zod";
import { AppError, validate } from "@abiturent/service-kit";
import { reportAudit } from "../audit.js";
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

type ProfileWithLatestVerification = Awaited<
  ReturnType<typeof getOrCreateProfile>
>;

function assertProfileReadyForSubmit(profile: ProfileWithLatestVerification) {
  if (!profile.birthDate || !profile.passportSeries || !profile.passportNumber) {
    throw AppError.badRequest("Заполните паспортные данные в анкете");
  }
  if (!profile.storageKey) {
    throw AppError.badRequest("Загрузите скан аттестата");
  }
  if (profile.attestatAverage == null) {
    throw AppError.badRequest("Укажите средний балл аттестата");
  }
}

function isProfileCompleteForSubmit(profile: ProfileWithLatestVerification) {
  return Boolean(
    profile.birthDate &&
      profile.passportSeries &&
      profile.passportNumber &&
      profile.storageKey &&
      profile.attestatAverage != null,
  );
}

/** draft / returned / rejected → pending so the item appears in moderator queue. */
async function markVerificationPending(
  profile: ProfileWithLatestVerification,
  actorId: string,
) {
  const latest = profile.verifications[0];
  if (!latest) {
    throw AppError.badRequest("Нет записи проверки");
  }
  if (latest.status === "pending") {
    throw AppError.conflict("Анкета уже на проверке");
  }
  if (latest.status === "approved") {
    throw AppError.conflict("Анкета уже подтверждена");
  }

  await prisma.verification.update({
    where: { id: latest.id },
    data: {
      status: "pending",
      submittedAt: new Date(),
      rejectReason: null,
      decidedAt: null,
      lockedBy: null,
    },
  });

  reportAudit({
    actorId,
    targetId: actorId,
    action: "verification_submit",
    payload: { verificationId: latest.id },
  });

  return prisma.applicantProfile.findUnique({
    where: { id: profile.id },
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

      reportAudit({
        actorId: userId,
        targetId: userId,
        action: "profile_update",
        payload: {
          fields: Object.keys(body),
        },
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

      let profile = await prisma.applicantProfile.update({
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

      reportAudit({
        actorId: userId,
        targetId: userId,
        action: "attestat_confirm",
        payload: {
          storageKey: body.storageKey,
          attestatAverage: body.attestatAverage ?? null,
        },
      });

      // When passport + attestat are complete, confirming the scan is the
      // "отправка на проверку" step — otherwise status stays draft and the
      // moderator queue never sees the item (submittedAt remains null).
      const latest = profile.verifications[0];
      if (
        isProfileCompleteForSubmit(profile) &&
        latest &&
        (latest.status === "draft" ||
          latest.status === "returned" ||
          latest.status === "rejected")
      ) {
        const submitted = await markVerificationPending(profile, userId);
        if (submitted) profile = submitted;
      }

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

      let aiRes: Response;
      try {
        aiRes = await fetch(`${config.aiUrl}/ocr/attestat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ storageKey: body.storageKey }),
        });
      } catch {
        throw AppError.badRequest(
          "OCR-сервис недоступен. Заполните поля вручную.",
        );
      }

      if (!aiRes.ok) {
        const text = await aiRes.text();
        throw AppError.badRequest(
          text || "OCR-сервис временно недоступен. Заполните поля вручную.",
        );
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

profilesRoutes.post(
  "/profile/me/submit",
  ...requireApplicant,
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();

      const profile = await getOrCreateProfile(userId);
      assertProfileReadyForSubmit(profile);
      const updated = await markVerificationPending(profile, userId);

      res.status(200).json(profileJson(updated!));
    } catch (err) {
      next(err);
    }
  },
);

profilesRoutes.post(
  "/profile/me/withdraw",
  ...requireApplicant,
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();

      const profile = await getOrCreateProfile(userId);
      const latest = profile.verifications[0];

      if (!latest) {
        throw AppError.badRequest("Нет записи проверки");
      }

      if (latest.status !== "pending") {
        throw AppError.badRequest(
          "Удалить можно только заявку, которая ещё на проверке",
        );
      }

      if (latest.lockedBy) {
        throw AppError.conflict(
          "Заявку уже взял модератор — удаление недоступно",
        );
      }

      await prisma.verification.update({
        where: { id: latest.id },
        data: {
          status: "draft",
          submittedAt: null,
          rejectReason: null,
          decidedAt: null,
          lockedBy: null,
        },
      });

      const updated = await prisma.applicantProfile.findUnique({
        where: { userId },
        include: profileInclude,
      });

      reportAudit({
        actorId: userId,
        targetId: userId,
        action: "verification_withdraw",
        payload: { verificationId: latest.id },
      });

      res.status(200).json(profileJson(updated!));
    } catch (err) {
      next(err);
    }
  },
);
