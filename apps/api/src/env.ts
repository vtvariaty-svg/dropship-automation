import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Render pode fornecer PORT como string
  PORT: z.coerce.number().default(3000),

  // Base pública do backend (ex: https://cliquebuy-automation-api.onrender.com)
  BASE_URL: z.string().min(1),

  // Opcional: base do web (se você tiver frontend). Pode ser igual ao BASE_URL.
  PUBLIC_WEB_BASE_URL: z.string().optional(),

  DATABASE_URL: z.string().min(1),

  // Opcional
  REDIS_URL: z.string().optional(),

  // Shopify (nomes "recomendados" que você está usando no Render)
  SHOPIFY_CLIENT_ID: z.string().min(1),
  SHOPIFY_CLIENT_SECRET: z.string().min(1),
  SHOPIFY_SCOPES: z.string().min(1),
  SHOPIFY_API_VERSION: z.string().min(1),
  SHOPIFY_REDIRECT_URI: z.string().min(1),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.flatten().fieldErrors;
  throw new Error(`Invalid environment variables:\n${JSON.stringify(details, null, 2)}`);
}

export type Env = z.infer<typeof schema>;
export const env: Env = parsed.data;
