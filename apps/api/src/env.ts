// apps/api/src/env.ts
import { z } from "zod";

function normalizeBaseUrl(u: string) {
  return u.replace(/\/+$/, "");
}

const schema = z.object({
  NODE_ENV: z.enum(["test", "development", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  // URL pública do seu backend (Render)
  BASE_URL: z
    .string()
    .min(1)
    .refine((v) => /^https?:\/\//i.test(v), "BASE_URL must start with http:// or https://")
    .transform(normalizeBaseUrl),

  // Banco
  DATABASE_URL: z.string().min(1),

  // Opcional (só se você for usar filas/worker)
  REDIS_URL: z.string().min(1).optional(),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Shopify (vamos aceitar os 2 nomes: API_KEY/SECRET e CLIENT_ID/SECRET)
  SHOPIFY_API_KEY: z.string().min(1),
  SHOPIFY_API_SECRET: z.string().min(1),
  SHOPIFY_CLIENT_ID: z.string().min(1),
  SHOPIFY_CLIENT_SECRET: z.string().min(1),

  SHOPIFY_SCOPES: z
    .string()
    .min(1)
    .default("read_products,write_products,read_orders,write_orders"),

  // Versão da Admin API (string)
  SHOPIFY_API_VERSION: z.string().min(1).default("2024-10"),
});

const raw = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,

  // Render normalmente não cria BASE_URL sozinho, então permitimos aliases:
  BASE_URL:
    process.env.BASE_URL ??
    process.env.PUBLIC_BASE_URL ??
    process.env.RENDER_EXTERNAL_URL ??
    process.env.RENDER_PUBLIC_URL,

  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  LOG_LEVEL: process.env.LOG_LEVEL,

  // Aliases (porque no Shopify "API key" == "client_id" e "API secret" == "client_secret")
  SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ?? process.env.SHOPIFY_CLIENT_ID,
  SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ?? process.env.SHOPIFY_CLIENT_SECRET,

  SHOPIFY_CLIENT_ID: process.env.SHOPIFY_CLIENT_ID ?? process.env.SHOPIFY_API_KEY,
  SHOPIFY_CLIENT_SECRET: process.env.SHOPIFY_CLIENT_SECRET ?? process.env.SHOPIFY_API_SECRET,

  SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES,
  SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION,
};

const parsed = schema.safeParse(raw);

if (!parsed.success) {
  // mensagem bem clara no log do Render
  const details = parsed.error.flatten().fieldErrors;
  throw new Error(`Invalid environment variables:\n${JSON.stringify(details, null, 2)}`);
}

export type Env = z.infer<typeof schema>;
export const env: Env = parsed.data;
