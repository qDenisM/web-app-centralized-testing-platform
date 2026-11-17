import { authenticate, requireRole } from "@abiturent/auth";
import { config } from "./config.js";

export const requireUser = [
  authenticate({
    jwksUrl: config.jwksUrl,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  }),
  requireRole("applicant", "moderator", "examiner", "admin"),
];

export const requireAdmin = [
  authenticate({
    jwksUrl: config.jwksUrl,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  }),
  requireRole("admin"),
];
