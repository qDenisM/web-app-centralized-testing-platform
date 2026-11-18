import { Router } from "express";
import { z } from "zod";
import { validate } from "@abiturent/service-kit";
import { PrismaClient as ApplicantClient } from "../../../applicant-service/generated/prisma/index.js";
import { requireExaminer } from "../auth.js";
import { config } from "../config.js";
import { lookupIdentityUsers } from "../identity.js";
import { prisma } from "../db.js";
import { applicationJson, examJson } from "../serializers.js";

export const examinerRoutes = Router();

const examInclude = { venue: true } as const;

const applicantDb = new ApplicantClient({
  datasources: { db: { url: config.applicantDatabaseUrl } },
});

const UsersLookupSchema = z.object({
  ids: z.array(z.string().uuid()).max(200),
});

async function loadApplicantMeta(userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<
    string,
    {
      fullName: string | null;
      email: string | null;
      graduateName: string | null;
      attestatAverage: number | null;
    }
  >();

  if (unique.length === 0) return map;

  const [identity, profiles] = await Promise.all([
    lookupIdentityUsers(unique),
    applicantDb.applicantProfile.findMany({
      where: { userId: { in: unique } },
      select: {
        userId: true,
        graduateName: true,
        attestatAverage: true,
      },
    }),
  ]);

  const profileByUser = new Map(profiles.map((p) => [p.userId, p]));

  for (const userId of unique) {
    const identityUser = identity.get(userId);
    const profile = profileByUser.get(userId);
    const identityName = identityUser?.fullName?.trim() || null;
    const docName = profile?.graduateName?.trim() || null;
    map.set(userId, {
      fullName:
        identityName || (docName && docName.length >= 2 ? docName : null),
      email: identityUser?.email?.trim() || null,
      graduateName: docName,
      attestatAverage:
        typeof profile?.attestatAverage === "number"
          ? profile.attestatAverage
          : null,
    });
  }

  return map;
}

examinerRoutes.get("/examiner/exams", ...requireExaminer, async (_req, res, next) => {
  try {
    const rows = await prisma.exam.findMany({
      include: examInclude,
      orderBy: { startsAt: "asc" },
    });
    res.status(200).json(rows.map(examJson));
  } catch (err) {
    next(err);
  }
});

examinerRoutes.get(
  "/examiner/applications",
  ...requireExaminer,
  async (req, res, next) => {
    try {
      const examId =
        typeof req.query.examId === "string" ? req.query.examId : undefined;
      const status =
        typeof req.query.status === "string" ? req.query.status : "approved";

      const rows = await prisma.application.findMany({
        where: {
          status,
          ...(examId ? { examId } : {}),
        },
        include: { exam: { include: examInclude } },
        orderBy: { createdAt: "asc" },
      });

      const metaByUser = await loadApplicantMeta(rows.map((r) => r.userId));

      res.status(200).json({
        items: rows.map((row) => ({
          ...applicationJson(row),
          applicant: metaByUser.get(row.userId) || {
            fullName: null,
            email: null,
            graduateName: null,
            attestatAverage: null,
          },
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

/** Resolve ФИО/email for examiner cards (applicants + «кто внёс»). */
examinerRoutes.post(
  "/examiner/users/lookup",
  ...requireExaminer,
  validate(UsersLookupSchema),
  async (req, res, next) => {
    try {
      const body = UsersLookupSchema.parse(req.body);
      const users = await lookupIdentityUsers(body.ids);
      res.status(200).json({
        users: [...users.values()].map((u) => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);
