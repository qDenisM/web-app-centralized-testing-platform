import { Router } from "express";
import {
  LoginRequestSchema,
  RegisterRequestSchema,
  RefreshRequestSchema,
  LogoutRequestSchema,
  RoleSchema,
  type AuthUser,
  type LoginResponse,
} from "@abiturent/contracts";
import { AppError, validate } from "@abiturent/service-kit";
import { prisma } from "../db.js";
import { hashPassword, verifyPassword } from "../password.js";
import {
  createRefreshToken,
  hashRefreshToken,
  refreshExpiresAt,
  signAccessToken,
} from "../tokens.js";
import { writeAudit } from "../audit.js";
import { clientIp } from "../auth-middleware.js";
import { config } from "../config.js";

export const authRoutes = Router();

function toAuthUser(user: {
  id: string;
  email: string;
  fullName: string;
  role: string;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: RoleSchema.parse(user.role),
  };
}

async function issueTokens(input: {
  user: { id: string; email: string; fullName: string; role: string };
  ip: string | null;
}): Promise<LoginResponse> {
  const role = RoleSchema.parse(input.user.role);
  const accessToken = await signAccessToken({
    userId: input.user.id,
    email: input.user.email,
    role,
  });

  const refreshToken = createRefreshToken();
  await prisma.session.create({
    data: {
      userId: input.user.id,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshExpiresAt(),
      ip: input.ip,
    },
  });

  return {
    user: toAuthUser(input.user),
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.accessTtlSec,
    },
  };
}

// Публичная регистрация — только абитуриент (staff создаём через seed).
authRoutes.post(
  "/auth/register",
  validate(RegisterRequestSchema),
  async (req, res, next) => {
    try {
      const body = RegisterRequestSchema.parse(req.body);
      const email = body.email.toLowerCase();
      const ip = clientIp(req);

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw AppError.conflict("Email already registered");
      }

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: await hashPassword(body.password),
          fullName: body.fullName,
          role: "applicant",
          status: "active",
        },
      });

      await writeAudit({
        actorId: user.id,
        targetId: user.id,
        action: "register",
        payload: { email: user.email, role: user.role },
      });

      const result = await issueTokens({ user, ip });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

authRoutes.post(
  "/auth/login",
  validate(LoginRequestSchema),
  async (req, res, next) => {
    try {
      const body = LoginRequestSchema.parse(req.body);
      const email = body.email.toLowerCase();
      const ip = clientIp(req);

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await verifyPassword(user.passwordHash, body.password))) {
        throw AppError.unauthorized("Invalid email or password");
      }

      if (user.status === "blocked") {
        const until = user.blockedUntil;
        if (!until || until.getTime() > Date.now()) {
          throw AppError.forbidden(
            user.blockedReason
              ? `Account blocked: ${user.blockedReason}`
              : "Account blocked",
          );
        }

        // Срок блокировки истёк — снимаем.
        await prisma.user.update({
          where: { id: user.id },
          data: {
            status: "active",
            blockedReason: null,
            blockedUntil: null,
          },
        });
        user.status = "active";
      }

      await writeAudit({
        actorId: user.id,
        targetId: user.id,
        action: "login",
        payload: { email: user.email },
      });

      const result = await issueTokens({ user, ip });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

authRoutes.post(
  "/auth/refresh",
  validate(RefreshRequestSchema),
  async (req, res, next) => {
    try {
      const { refreshToken } = RefreshRequestSchema.parse(req.body);
      const tokenHash = hashRefreshToken(refreshToken);
      const ip = clientIp(req);

      const session = await prisma.session.findFirst({
        where: {
          refreshTokenHash: tokenHash,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!session) {
        throw AppError.unauthorized("Invalid or expired refresh token");
      }

      if (session.user.status === "blocked") {
        throw AppError.forbidden("Account blocked");
      }

      // Ротация refresh-токена.
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });

      await writeAudit({
        actorId: session.userId,
        targetId: session.userId,
        action: "token_refresh",
      });

      const result = await issueTokens({ user: session.user, ip });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

authRoutes.post(
  "/auth/logout",
  validate(LogoutRequestSchema),
  async (req, res, next) => {
    try {
      const { refreshToken } = LogoutRequestSchema.parse(req.body);
      const tokenHash = hashRefreshToken(refreshToken);

      const session = await prisma.session.findFirst({
        where: { refreshTokenHash: tokenHash, revokedAt: null },
      });

      if (session) {
        await prisma.session.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });

        await writeAudit({
          actorId: session.userId,
          targetId: session.userId,
          action: "logout",
        });
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
