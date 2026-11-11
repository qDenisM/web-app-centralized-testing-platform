import { z } from "zod";

export const RoleSchema = z.enum([
  "applicant",
  "examiner",
  "moderator",
  "admin",
]);

export type Role = z.infer<typeof RoleSchema>;

export const ROLES = RoleSchema.options;
