import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3004),
  NODE_ENV: z.string().default("development"),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().min(1),
  CATALOG_DATABASE_URL: z
    .string()
    .default("postgresql://abiturent:abiturent@localhost:5432/catalog"),
  APPLICANT_DATABASE_URL: z
    .string()
    .default("postgresql://abiturent:abiturent@localhost:5432/applicant"),
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
  MINIO_BUCKET_PASSES: z.string().default("passes"),
  MINIO_FORCE_PATH_STYLE: z
    .string()
    .default("true")
    .transform((v) => v !== "false"),
  DOWNLOAD_URL_TTL_SEC: z.coerce.number().int().positive().default(600),
});

const parsed = EnvSchema.parse(process.env);

export const config = {
  port: parsed.PORT,
  nodeEnv: parsed.NODE_ENV,
  logLevel: parsed.LOG_LEVEL,
  databaseUrl: parsed.DATABASE_URL,
  catalogDatabaseUrl: parsed.CATALOG_DATABASE_URL,
  applicantDatabaseUrl: parsed.APPLICANT_DATABASE_URL,
  jwksUrl: parsed.JWKS_URL,
  jwtIssuer: parsed.JWT_ISSUER,
  jwtAudience: parsed.JWT_AUDIENCE,
  minio: {
    endpoint: parsed.MINIO_ENDPOINT,
    region: parsed.MINIO_REGION,
    accessKey: parsed.MINIO_ACCESS_KEY,
    secretKey: parsed.MINIO_SECRET_KEY,
    passesBucket: parsed.MINIO_BUCKET_PASSES,
    forcePathStyle: parsed.MINIO_FORCE_PATH_STYLE,
  },
  downloadUrlTtlSec: parsed.DOWNLOAD_URL_TTL_SEC,
};
