import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

loadEnv();

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.string().default("development"),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().min(1),
  JWT_PRIVATE_KEY_PATH: z.string().default("./keys/private.pem"),
  JWT_PUBLIC_KEY_PATH: z.string().default("./keys/public.pem"),
  JWT_KID: z.string().default("identity-dev-1"),
  JWT_ISSUER: z.string().default("abiturent-identity"),
  JWT_AUDIENCE: z.string().default("abiturent"),
  ACCESS_TOKEN_TTL_SEC: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_SEC: z.coerce.number().int().positive().default(604800),
});

const parsed = EnvSchema.parse(process.env);

function readPem(relPath: string): string {
  return readFileSync(resolve(process.cwd(), relPath), "utf8");
}

export const config = {
  port: parsed.PORT,
  nodeEnv: parsed.NODE_ENV,
  logLevel: parsed.LOG_LEVEL,
  databaseUrl: parsed.DATABASE_URL,
  jwt: {
    privateKeyPem: readPem(parsed.JWT_PRIVATE_KEY_PATH),
    publicKeyPem: readPem(parsed.JWT_PUBLIC_KEY_PATH),
    kid: parsed.JWT_KID,
    issuer: parsed.JWT_ISSUER,
    audience: parsed.JWT_AUDIENCE,
    accessTtlSec: parsed.ACCESS_TOKEN_TTL_SEC,
    refreshTtlSec: parsed.REFRESH_TOKEN_TTL_SEC,
  },
};
