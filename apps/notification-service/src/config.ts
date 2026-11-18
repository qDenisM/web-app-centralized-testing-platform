import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3007),
  NODE_ENV: z.string().default("development"),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().min(1),
  JWKS_URL: z
    .string()
    .url()
    .default("http://localhost:3001/.well-known/jwks.json"),
  JWT_ISSUER: z.string().default("abiturent-identity"),
  JWT_AUDIENCE: z.string().default("abiturent"),
  RABBITMQ_URL: z
    .string()
    .default("amqp://abiturent:abiturent@localhost:5672"),
  IDENTITY_URL: z.string().url().default("http://localhost:3001"),
  INTERNAL_AUDIT_TOKEN: z.string().min(1).default("dev-audit-token"),
});

const parsed = EnvSchema.parse(process.env);

export const config = {
  port: parsed.PORT,
  nodeEnv: parsed.NODE_ENV,
  logLevel: parsed.LOG_LEVEL,
  databaseUrl: parsed.DATABASE_URL,
  jwksUrl: parsed.JWKS_URL,
  jwtIssuer: parsed.JWT_ISSUER,
  jwtAudience: parsed.JWT_AUDIENCE,
  rabbitmqUrl: parsed.RABBITMQ_URL,
  identityUrl: parsed.IDENTITY_URL.replace(/\/$/, ""),
  internalAuditToken: parsed.INTERNAL_AUDIT_TOKEN,
};
