import { createHash, randomBytes } from "node:crypto";
import {
  exportJWK,
  importPKCS8,
  importSPKI,
  SignJWT,
  jwtVerify,
  type JWK,
} from "jose";
import type { Role } from "@abiturent/contracts";
import type { JwtPayload } from "@abiturent/auth";
import { config } from "./config.js";

type CryptoKeyLike = Awaited<ReturnType<typeof importPKCS8>>;

let privateKey: CryptoKeyLike | null = null;
let publicKey: CryptoKeyLike | null = null;
let publicJwk: JWK | null = null;

async function getPrivateKey(): Promise<CryptoKeyLike> {
  if (!privateKey) {
    privateKey = await importPKCS8(config.jwt.privateKeyPem, "RS256");
  }
  return privateKey;
}

async function getPublicKey(): Promise<CryptoKeyLike> {
  if (!publicKey) {
    publicKey = await importSPKI(config.jwt.publicKeyPem, "RS256");
  }
  return publicKey;
}

export async function getJwks(): Promise<{ keys: JWK[] }> {
  if (!publicJwk) {
    const key = await getPublicKey();
    const jwk = await exportJWK(key);
    publicJwk = {
      ...jwk,
      kid: config.jwt.kid,
      alg: "RS256",
      use: "sig",
    };
  }
  return { keys: [publicJwk] };
}

export async function signAccessToken(input: {
  userId: string;
  email: string;
  role: Role;
}): Promise<string> {
  const key = await getPrivateKey();
  return new SignJWT({
    email: input.email,
    role: input.role,
  })
    .setProtectedHeader({ alg: "RS256", kid: config.jwt.kid, typ: "JWT" })
    .setSubject(input.userId)
    .setIssuer(config.jwt.issuer)
    .setAudience(config.jwt.audience)
    .setIssuedAt()
    .setExpirationTime(`${config.jwt.accessTtlSec}s`)
    .sign(key);
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const key = await getPublicKey();
  const { payload } = await jwtVerify(token, key, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });

  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("JWT missing sub");
  }
  if (typeof payload.email !== "string") {
    throw new Error("JWT missing email");
  }
  if (typeof payload.role !== "string") {
    throw new Error("JWT missing role");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    role: payload.role as Role,
    jti: typeof payload.jti === "string" ? payload.jti : undefined,
  };
}

export function createRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshExpiresAt(): Date {
  return new Date(Date.now() + config.jwt.refreshTtlSec * 1000);
}
