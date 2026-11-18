import { Router } from "express";
import { AppError } from "@abiturent/service-kit";
import { reportAudit } from "../audit.js";
import { requireApplicant } from "../auth.js";
import { prisma } from "../db.js";
import { publishApplicationSubmitted } from "../notify.js";
import { hasMeaningfulCtResult } from "../results-sync.js";
import { applicationJson, examJson, waitlistJson } from "../serializers.js";

export const examsRoutes = Router();

const examInclude = { venue: true } as const;

examsRoutes.get("/exams", async (req, res, next) => {
  try {
    const subjectId =
      typeof req.query.subjectId === "string" ? req.query.subjectId : undefined;
    const isReserve =
      req.query.isReserve === "true"
        ? true
        : req.query.isReserve === "false"
          ? false
          : undefined;

    const rows = await prisma.exam.findMany({
      where: {
        ...(subjectId ? { subjectId } : {}),
        ...(isReserve === undefined ? {} : { isReserve }),
      },
      include: examInclude,
      orderBy: { startsAt: "asc" },
    });

    res.status(200).json(rows.map(examJson));
  } catch (err) {
    next(err);
  }
});

examsRoutes.get("/exams/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const row = await prisma.exam.findUnique({
      where: { id },
      include: examInclude,
    });
    if (!row) throw AppError.notFound("Exam not found");
    res.status(200).json(examJson(row));
  } catch (err) {
    next(err);
  }
});

examsRoutes.post(
  "/exams/:id/apply",
  ...requireApplicant,
  async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      if (!userId) throw AppError.unauthorized();
      const examId = String(req.params.id);

      const exam = await prisma.exam.findUnique({ where: { id: examId } });
      if (!exam) throw AppError.notFound("Exam not found");

      const campaignYear = exam.startsAt.getFullYear();
      const alreadyScored = await hasMeaningfulCtResult({
        userId,
        subjectId: exam.subjectId,
        campaignYear,
      });
      if (alreadyScored) {
        throw AppError.conflict(
          "Результат по этому предмету за кампанию уже есть",
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const existingApp = await tx.application.findUnique({
          where: { examId_userId: { examId, userId } },
        });
        if (existingApp && existingApp.status !== "cancelled") {
          throw AppError.conflict("Уже есть заявка на этот сеанс");
        }

        const existingWait = await tx.waitlistEntry.findUnique({
          where: { examId_userId: { examId, userId } },
        });
        if (existingWait && existingWait.status === "waiting") {
          throw AppError.conflict("Вы уже в листе ожидания");
        }

        const activeSameSubject = await tx.application.findFirst({
          where: {
            userId,
            status: { in: ["pending", "approved"] },
            exam: {
              subjectId: exam.subjectId,
              startsAt: {
                gte: new Date(Date.UTC(campaignYear, 0, 1)),
                lt: new Date(Date.UTC(campaignYear + 1, 0, 1)),
              },
            },
          },
        });
        if (activeSameSubject) {
          throw AppError.conflict("Уже есть активная запись на этот предмет");
        }

        const seated = await tx.$queryRaw<{ id: string }[]>`
          UPDATE exams
          SET seats_taken = seats_taken + 1
          WHERE id = ${examId}::uuid AND seats_taken < capacity
          RETURNING id
        `;

        if (seated.length > 0) {
          if (existingApp) {
            const updated = await tx.application.update({
              where: { id: existingApp.id },
              data: {
                status: "pending",
                rejectReason: null,
                passNumber: null,
                createdAt: new Date(),
              },
              include: { exam: { include: examInclude } },
            });
            return { kind: "application" as const, row: updated };
          }

          const created = await tx.application.create({
            data: {
              examId,
              userId,
              status: "pending",
            },
            include: { exam: { include: examInclude } },
          });
          return { kind: "application" as const, row: created };
        }

        const last = await tx.waitlistEntry.findFirst({
          where: { examId },
          orderBy: { position: "desc" },
        });
        const position = (last?.position ?? 0) + 1;

        if (existingWait) {
          const updated = await tx.waitlistEntry.update({
            where: { id: existingWait.id },
            data: {
              status: "waiting",
              position,
              offerExpiresAt: null,
            },
            include: { exam: { include: examInclude } },
          });
          return { kind: "waitlist" as const, row: updated };
        }

        const created = await tx.waitlistEntry.create({
          data: {
            examId,
            userId,
            position,
            status: "waiting",
          },
          include: { exam: { include: examInclude } },
        });
        return { kind: "waitlist" as const, row: created };
      });

      if (result.kind === "application") {
        reportAudit({
          actorId: userId,
          targetId: userId,
          action: "ct_apply",
          payload: { examId, applicationId: result.row.id },
        });
        await publishApplicationSubmitted({
          userId,
          applicationId: result.row.id,
          examId,
        });
        res.status(201).json({
          type: "application",
          application: applicationJson(result.row),
        });
        return;
      }

      reportAudit({
        actorId: userId,
        targetId: userId,
        action: "ct_waitlist_join",
        payload: { examId, waitlistId: result.row.id },
      });
      res.status(201).json({
        type: "waitlist",
        waitlist: waitlistJson(result.row),
      });
    } catch (err) {
      next(err);
    }
  },
);
