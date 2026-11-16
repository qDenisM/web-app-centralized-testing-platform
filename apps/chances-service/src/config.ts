import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3006),
  NODE_ENV: z.string().default("development"),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().min(1),
  JWKS_URL: z
    .string()
    .url()
    .default("http://localhost:3001/.well-known/jwks.json"),
  JWT_ISSUER: z.string().default("abiturent-identity"),
  JWT_AUDIENCE: z.string().default("abiturent"),
  CATALOG_URL: z.string().url().default("http://localhost:3002"),
  APPLICANT_URL: z.string().url().default("http://localhost:3003"),
  RESULTS_URL: z.string().url().default("http://localhost:3005"),
  EXAM_URL: z.string().url().default("http://localhost:3004"),
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
  catalogUrl: parsed.CATALOG_URL.replace(/\/$/, ""),
  applicantUrl: parsed.APPLICANT_URL.replace(/\/$/, ""),
  resultsUrl: parsed.RESULTS_URL.replace(/\/$/, ""),
  examUrl: parsed.EXAM_URL.replace(/\/$/, ""),
};