import { z } from "zod";

/**
 * Runtime environment validation
 * This file is the single source of truth for env vars
 */

const EnvSchema = z.object({
  NODE_ENV: z.enum(["test", "development", "production"]).default("development"),

  PORT: z.coerce.number().default(3000),

  BASE_URL: z.string().url(),

  // === Database ===
  DATABASE_URL: z.string().min(1),

  // === Shopify ===
  SHOPIFY_API_KEY: z.string().min(1),
  SHOPIFY_API_SECRET: z.string().min(1),
  SHOPIFY_SCOPES: z.string().min(1),
  SHOPIFY_API_VERSION: z.string().min(1),

  // === Optional / Infra ===
  REDIS_URL: z.string().optional(),

  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
