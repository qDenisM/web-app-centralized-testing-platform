import { authenticate, requireRole } from "@abiturent/auth";
import { config } from "./config.js";

export const requireExaminer = [
  authenticate({
    jwksUrl: config.jwksUrl,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  }),
  requireRole("examiner", "admin"),
];

export const requireApplicant = [
  authenticate({
    jwksUrl: config.jwksUrl,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  }),
  requireRole("applicant", "admin"),
];
