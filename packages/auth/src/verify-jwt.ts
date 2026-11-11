import { jwtVerify, type JWTPayload } from "jose";
import { RoleSchema, type Role } from "@abiturent/contracts";
import { getJwks } from "./jwks.js";
import type { JwtPayload } from "./types.js";

export type VerifyJwtOptions = {
  jwksUrl: string;
  issuer?: string;
  audience?: string | string[];
};

function asRole(value: unknown): Role {
  return RoleSchema.parse(value);
}

function toJwtPayload(payload: JWTPayload): JwtPayload {
  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("JWT missing sub");
  }
  if (typeof payload.email !== "string") {
    throw new Error("JWT missing email");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    role: asRole(payload.role),
    jti: typeof payload.jti === "string" ? payload.jti : undefined,
  };
}

export async function verifyJwt(
  token: string,
  options: VerifyJwtOptions,
): Promise<JwtPayload> {
  const jwks = getJwks(options.jwksUrl);
  const { payload } = await jwtVerify(token, jwks, {
    issuer: options.issuer,
    audience: options.audience,
  });
  return toJwtPayload(payload);
}
