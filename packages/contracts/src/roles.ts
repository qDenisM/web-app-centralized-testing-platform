import { z } from "zod";

/** Роли платформы (RBAC в JWT). */
export const RoleSchema = z.enum([
  "applicant",
  "examiner",
  "moderator",
  "admin",
]);

export type Role = z.infer<typeof RoleSchema>;

export const ROLES = RoleSchema.options;
