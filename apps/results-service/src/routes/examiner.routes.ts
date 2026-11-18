import { Router } from "express";
import { z } from "zod";
import { AppError, validate } from "@abiturent/service-kit";
import { requireExaminer } from "../auth.js";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { publishResultPublished } from "../notify.js";
import { assertCanPublish, ensureResultRow } from "../result-rows.js";
import { resultJson } from "../serializers.js";

export const examinerRoutes = Router();

const UpdateSchema = z.object({
  score: z.number().int().min(0).max(100).nullable().optional(),
  status: z.enum(["draft", "absent", "missing"]).optional(),
});

const BatchPublishSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

async function examFetch(path: string, token: string) {
  const res = await fetch(`${config.examUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    throw AppError.badRequest(
      (data as { error?: string } | null)?.error || "Ошибка exam-service",
    );
  }
  return data;
}

examinerRoutes.get(
  "/examiner/results",
  ...requireExaminer,
  async (req, res, next) => {
    try {
      const examId =
        typeof req.query.examId === "string" ? req.query.examId : undefined;
      const status =
        typeof req.query.status === "string" ? req.query.status : undefined;
      const mine = req.query.mine === "true";
      const examinerId = req.user?.sub;

      const rows = await prisma.ctResult.findMany({
        where: {
          ...(examId ? { examId } : {}),
          ...(status && status !== "all" ? { status } : {}),
          ...(mine && examinerId ? { enteredBy: examinerId } : {}),
        },
        orderBy: { updatedAt: "desc" },
      });

      const counts = {
        all: await prisma.ctResult.count({
          where: examId ? { examId } : undefined,
        }),
        missing: await prisma.ctResult.count({
          where: { status: "missing", ...(examId ? { examId } : {}) },
        }),
        draft: await prisma.ctResult.count({
          where: { status: "draft", ...(examId ? { examId } : {}) },
        }),
        absent: await prisma.ctResult.count({
          where: { status: "absent", ...(examId ? { examId } : {}) },
        }),
        published: await prisma.ctResult.count({
          where: { status: "published", ...(examId ? { examId } : {}) },
        }),
      };

      res.status(200).json({ items: rows.map(resultJson), counts });
    } catch (err) {
      next(err);
    }
  },
);

examinerRoutes.post(
  "/examiner/results/sync",
  ...requireExaminer,
  async (req, res, next) => {
    try {
      const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
      if (!token) throw AppError.unauthorized();

      const examId =
        typeof req.body?.examId === "string" ? req.body.examId : undefined;

      const path = examId
        ? `/examiner/applications?status=approved&examId=${examId}`
        : "/examiner/applications?status=approved";
      const payload = (await examFetch(path, token)) as {
        items: Array<{ examId: string; userId: string }>;
      };

      let created = 0;
      const approvedKeys = new Set<string>();
      for (const app of payload.items || []) {
        const item = app as {
          examId: string;
          userId: string;
          exam?: { subjectId?: string; startsAt?: string };
        };
        approvedKeys.add(`${item.examId}:${item.userId}`);
        const startsAt = item.exam?.startsAt
          ? new Date(item.exam.startsAt)
          : null;
        const ensured = await ensureResultRow({
          examId: item.examId,
          userId: item.userId,
          subjectId: item.exam?.subjectId,
          campaignYear:
            startsAt && !Number.isNaN(startsAt.getTime())
              ? startsAt.getFullYear()
              : undefined,
        });
        if (ensured.created) created += 1;
      }

      const rows = await prisma.ctResult.findMany({
        where: examId ? { examId } : undefined,
        orderBy: { updatedAt: "desc" },
      });

      // Only rows for currently approved applications (re-approve restores them).
      const visible = rows.filter((row) =>
        approvedKeys.has(`${row.examId}:${row.userId}`),
      );

      res.status(200).json({ created, items: visible.map(resultJson) });
    } catch (err) {
      next(err);
    }
  },
);

examinerRoutes.post(
  "/examiner/results/publish-batch",
  ...requireExaminer,
  validate(BatchPublishSchema),
  async (req, res, next) => {
    try {
      const examinerId = req.user?.sub;
      if (!examinerId) throw AppError.unauthorized();
      const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
      if (!token) throw AppError.unauthorized();
      const body = BatchPublishSchema.parse(req.body);
      const published = [];

      for (const id of body.ids) {
        const row = await prisma.ctResult.findUnique({ where: { id } });
        if (!row || row.score === null || row.status === "absent") continue;
        if (row.status === "published") {
          published.push(resultJson(row));
          continue;
        }
        try {
          await assertApplicationApproved(token, row.examId, row.userId);
        } catch {
          continue;
        }
        const meta = await assertCanPublish(row);
        let updated;
        try {
          updated = await prisma.ctResult.update({
            where: { id },
            data: {
              status: "published",
              publishedAt: new Date(),
              enteredBy: row.enteredBy || examinerId,
              subjectId: meta.subjectId,
              campaignYear: meta.campaignYear,
            },
          });
        } catch (err) {
          if (
            err &&
            typeof err === "object" &&
            "code" in err &&
            (err as { code?: string }).code === "P2002"
          ) {
            throw AppError.conflict(
              "Опубликованный результат по этому предмету за кампанию уже есть",
            );
          }
          throw err;
        }
        await publishResultPublished({
          userId: updated.userId,
          resultId: updated.id,
          examId: updated.examId,
          score: updated.score!,
        });
        published.push(resultJson(updated));
      }

      res.status(200).json({ items: published, count: published.length });
    } catch (err) {
      next(err);
    }
  },
);

async function assertApplicationApproved(
  token: string,
  examId: string,
  userId: string,
) {
  const path = `/examiner/applications?status=approved&examId=${encodeURIComponent(examId)}`;
  const payload = (await examFetch(path, token)) as {
    items?: Array<{ userId: string }>;
  };
  const ok = (payload.items || []).some((app) => app.userId === userId);
  if (!ok) {
    throw AppError.conflict(
      "Заявка на этот экзамен не одобрена — внесение баллов недоступно",
    );
  }
}

examinerRoutes.patch(
  "/examiner/results/:id",
  ...requireExaminer,
  validate(UpdateSchema),
  async (req, res, next) => {
    try {
      const examinerId = req.user?.sub;
      if (!examinerId) throw AppError.unauthorized();
      const id = String(req.params.id);
      const body = UpdateSchema.parse(req.body);

      const row = await prisma.ctResult.findUnique({ where: { id } });
      if (!row) throw AppError.notFound("Result not found");

      const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
      if (!token) throw AppError.unauthorized();
      await assertApplicationApproved(token, row.examId, row.userId);

      // Published score correction: keep published, notify applicant again.
      if (row.status === "published") {
        if (body.score === undefined || body.score === null) {
          throw AppError.badRequest(
            "Для опубликованного результата укажите новый балл (0–100)",
          );
        }
        if (body.status) {
          throw AppError.badRequest(
            "Статус опубликованного результата менять нельзя",
          );
        }
        const updated = await prisma.ctResult.update({
          where: { id },
          data: {
            score: body.score,
            enteredBy: examinerId,
          },
        });
        await publishResultPublished({
          userId: updated.userId,
          resultId: updated.id,
          examId: updated.examId,
          score: updated.score!,
        });
        res.status(200).json(resultJson(updated));
        return;
      }

      let status = body.status ?? row.status;
      let score = body.score === undefined ? row.score : body.score;

      if (status === "absent") {
        score = null;
      } else if (score !== null && score !== undefined) {
        status = "draft";
      } else if (status === "draft" && (score === null || score === undefined)) {
        status = "missing";
      }

      const updated = await prisma.ctResult.update({
        where: { id },
        data: {
          status,
          score,
          enteredBy: examinerId,
        },
      });

      res.status(200).json(resultJson(updated));
    } catch (err) {
      next(err);
    }
  },
);

examinerRoutes.post(
  "/examiner/results/:id/publish",
  ...requireExaminer,
  async (req, res, next) => {
    try {
      const examinerId = req.user?.sub;
      if (!examinerId) throw AppError.unauthorized();
      const id = String(req.params.id);

      const row = await prisma.ctResult.findUnique({ where: { id } });
      if (!row) throw AppError.notFound("Result not found");
      if (row.status === "published") {
        res.status(200).json(resultJson(row));
        return;
      }

      const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
      if (!token) throw AppError.unauthorized();
      await assertApplicationApproved(token, row.examId, row.userId);
      const meta = await assertCanPublish(row);

      let updated;
      try {
        updated = await prisma.ctResult.update({
          where: { id },
          data: {
            status: "published",
            publishedAt: new Date(),
            enteredBy: row.enteredBy || examinerId,
            subjectId: meta.subjectId,
            campaignYear: meta.campaignYear,
          },
        });
      } catch (err) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code?: string }).code === "P2002"
        ) {
          throw AppError.conflict(
            "Опубликованный результат по этому предмету за кампанию уже есть",
          );
        }
        throw err;
      }

      await publishResultPublished({
        userId: updated.userId,
        resultId: updated.id,
        examId: updated.examId,
        score: updated.score!,
      });

      res.status(200).json(resultJson(updated));
    } catch (err) {
      next(err);
    }
  },
);
