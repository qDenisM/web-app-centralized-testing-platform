import { Router } from "express";
import { z } from "zod";
import { AppError, validate } from "@abiturent/service-kit";
import { config } from "../config.js";
import {
  ensureResultRow,
  findMeaningfulResult,
  retractPublishedResult,
} from "../result-rows.js";

export const internalRoutes = Router();

const BodySchema = z.object({
  examId: z.string().uuid(),
  userId: z.string().uuid(),
  subjectId: z.string().uuid().optional(),
  campaignYear: z.number().int().optional(),
});

const ExistsSchema = z.object({
  userId: z.string().uuid(),
  subjectId: z.string().uuid(),
  campaignYear: z.number().int().min(2000).max(2100),
});

function requireInternal(req: { header: (name: string) => string | undefined }) {
  const token = req.header("x-internal-token");
  if (!token || token !== config.internalToken) {
    throw AppError.unauthorized("Invalid internal token");
  }
}

internalRoutes.post(
  "/internal/results/ensure",
  validate(BodySchema),
  async (req, res, next) => {
    try {
      requireInternal(req);
      const body = BodySchema.parse(req.body);
      const result = await ensureResultRow(body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

internalRoutes.post(
  "/internal/results/retract",
  validate(BodySchema),
  async (req, res, next) => {
    try {
      requireInternal(req);
      const body = BodySchema.parse(req.body);
      const result = await retractPublishedResult(body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

internalRoutes.post(
  "/internal/results/exists",
  validate(ExistsSchema),
  async (req, res, next) => {
    try {
      requireInternal(req);
      const body = ExistsSchema.parse(req.body);
      const result = await findMeaningfulResult(body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);
