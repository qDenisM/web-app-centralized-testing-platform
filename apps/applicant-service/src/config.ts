import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3003),
  NODE_ENV: z.string().default("development"),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().min(1),
  JWKS_URL: z
    .string()
    .url()
    .default("http://localhost:3001/.well-known/jwks.json"),
  JWT_ISSUER: z.string().default("abiturent-identity"),
  JWT_AUDIENCE: z.string().default("abiturent"),
  MINIO_ENDPOINT: z.string().default("http://localhost:9000"),
  MINIO_REGION: z.string().default("us-east-1"),
  MINIO_ACCESS_KEY: z.string().default("abiturent"),
  MINIO_SECRET_KEY: z.string().default("abiturent_secret"),
  MINIO_BUCKET_DOCUMENTS: z.string().default("documents"),
  MINIO_FORCE_PATH_STYLE: z
    .string()
    .default("true")
    .transform((v) => v !== "false"),
  UPLOAD_URL_TTL_SEC: z.coerce.number().int().positive().default(600),
  AI_URL: z.string().url().default("http://localhost:3010"),
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
  minio: {
    endpoint: parsed.MINIO_ENDPOINT,
    region: parsed.MINIO_REGION,
    accessKey: parsed.MINIO_ACCESS_KEY,
    secretKey: parsed.MINIO_SECRET_KEY,
    documentsBucket: parsed.MINIO_BUCKET_DOCUMENTS,
    forcePathStyle: parsed.MINIO_FORCE_PATH_STYLE,
  },
  uploadUrlTtlSec: parsed.UPLOAD_URL_TTL_SEC,
  aiUrl: parsed.AI_URL,
  rabbitmqUrl: parsed.RABBITMQ_URL,
  identityUrl: parsed.IDENTITY_URL.replace(/\/$/, ""),
  internalAuditToken: parsed.INTERNAL_AUDIT_TOKEN,
};
