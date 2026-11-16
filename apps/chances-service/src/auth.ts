import { authenticate, requireRole } from "@abiturent/auth";
import { config } from "./config.js";

export const requireApplicant = [
  authenticate({
    jwksUrl: config.jwksUrl,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  }),
  requireRole("applicant", "admin"),
];