import { z } from "zod";

/**
 * Single source of truth for env vars
 * Supports BOTH naming conventions:
 * - SHOPIFY_API_KEY / SHOPIFY_API_SECRET (preferred)
 * - SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET (legacy/alternate)
 */

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["test", "development", "production"]).default("development"),
    PORT: z.coerce.number().default(3000),

    BASE_URL: z.string().url(),

    // === Database ===
    DATABASE_URL: z.string().min(1),

    // === Shopify (two naming styles) ===
    SHOPIFY_API_KEY: z.string().optional(),
    SHOPIFY_API_SECRET: z.string().optional(),

    SHOPIFY_CLIENT_ID: z.string().optional(),
    SHOPIFY_CLIENT_SECRET: z.string().optional(),

    SHOPIFY_SCOPES: z.string().min(1),
    SHOPIFY_API_VERSION: z.string().min(1),

    // === Optional / Infra ===
    REDIS_URL: z.string().optional(),

    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  })
  .superRefine((val, ctx) => {
    const hasApiPair = !!(val.SHOPIFY_API_KEY && val.SHOPIFY_API_SECRET);
    const hasClientPair = !!(val.SHOPIFY_CLIENT_ID && val.SHOPIFY_CLIENT_SECRET);

    if (!hasApiPair && !hasClientPair) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SHOPIFY_API_KEY"],
        message:
          "Missing Shopify credentials. Provide either (SHOPIFY_API_KEY & SHOPIFY_API_SECRET) OR (SHOPIFY_CLIENT_ID & SHOPIFY_CLIENT_SECRET).",
      });
    }
  });

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.format());
  process.exit(1);
}

const data = parsed.data;

// Resolve aliases so the rest of the code can use either name safely
const resolvedShopifyClientId = data.SHOPIFY_CLIENT_ID ?? data.SHOPIFY_API_KEY!;
const resolvedShopifyClientSecret =
  data.SHOPIFY_CLIENT_SECRET ?? data.SHOPIFY_API_SECRET!;

export const env = {
  ...data,

  // Ensure both styles exist for type-safety across the codebase
  SHOPIFY_CLIENT_ID: resolvedShopifyClientId,
  SHOPIFY_CLIENT_SECRET: resolvedShopifyClientSecret,

  SHOPIFY_API_KEY: data.SHOPIFY_API_KEY ?? resolvedShopifyClientId,
  SHOPIFY_API_SECRET: data.SHOPIFY_API_SECRET ?? resolvedShopifyClientSecret,
} as const;

export type Env = typeof env;
