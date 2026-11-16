import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3008),
  NODE_ENV: z.string().default("development"),
  LOG_LEVEL: z.string().default("info"),
  CLICKHOUSE_URL: z
    .string()
    .url()
    .default("http://localhost:8123"),
  CLICKHOUSE_USER: z.string().default("abiturent"),
  CLICKHOUSE_PASSWORD: z.string().default("abiturent"),
});

const parsed = EnvSchema.parse(process.env);

export const config = {
  port: parsed.PORT,
  nodeEnv: parsed.NODE_ENV,
  logLevel: parsed.LOG_LEVEL,
  clickhouse: {
    url: parsed.CLICKHOUSE_URL.replace(/\/$/, ""),
    user: parsed.CLICKHOUSE_USER,
    password: parsed.CLICKHOUSE_PASSWORD,
  },
};