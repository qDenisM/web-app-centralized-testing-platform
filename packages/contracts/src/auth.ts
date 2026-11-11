import { z } from "zod";
import { RoleSchema } from "./roles.js";

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(200),
  role: RoleSchema.default("applicant").optional(),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
});

export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  role: RoleSchema,
});

export type AuthUser = z.infer<typeof AuthUserSchema>;

export const LoginResponseSchema = z.object({
  user: AuthUserSchema,
  tokens: AuthTokensSchema,
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

export const LogoutRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;

export const BlockUserRequestSchema = z.object({
  reason: z.string().min(2).max(500),
  blockedUntil: z.string().datetime().optional().nullable(),
});

export type BlockUserRequest = z.infer<typeof BlockUserRequestSchema>;

