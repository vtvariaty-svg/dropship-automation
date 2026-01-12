// apps/api/src/env.ts
// ÚNICA fonte da verdade de env vars.
// Sem zod (evita dependências frágeis) e com falhas claras em runtime.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length ? value : undefined;
}

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

const NODE_ENV = (process.env.NODE_ENV ?? "development") as
  | "development"
  | "test"
  | "production";

const BASE_URL = required("BASE_URL").replace(/\/$/, "");

// Shopify redirect URI:
// - Se SHOPIFY_REDIRECT_URI estiver definido, usa exatamente.
// - Caso contrário, deriva de BASE_URL (padrão estável para Render).
const SHOPIFY_REDIRECT_URI =
  (optional("SHOPIFY_REDIRECT_URI")?.trim() || `${BASE_URL}/shopify/callback`).trim();

export const env = {
  NODE_ENV,
  PORT: numberFromEnv("PORT", 3000),

  BASE_URL,
  PUBLIC_WEB_BASE_URL: optional("PUBLIC_WEB_BASE_URL"),

  DATABASE_URL: required("DATABASE_URL"),
  REDIS_URL: optional("REDIS_URL"),

  // Shopify (mantém os nomes que você já usa no Render)
  SHOPIFY_CLIENT_ID: required("SHOPIFY_CLIENT_ID"),
  SHOPIFY_CLIENT_SECRET: required("SHOPIFY_CLIENT_SECRET"),
  SHOPIFY_SCOPES: required("SHOPIFY_SCOPES"),
  SHOPIFY_API_VERSION: required("SHOPIFY_API_VERSION"),
  SHOPIFY_REDIRECT_URI,
};

export type Env = typeof env;
