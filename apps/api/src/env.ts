// apps/api/src/env.ts
export type Env = {
  NODE_ENV: "development" | "production" | "test";
  PORT: number;

  // Base do seu backend (Render)
  BASE_URL: string;

  // Base pública do web (se usar frontend separado)
  PUBLIC_WEB_BASE_URL?: string;

  DATABASE_URL: string;
  REDIS_URL?: string;

  // Shopify
  SHOPIFY_CLIENT_ID: string;
  SHOPIFY_CLIENT_SECRET: string;
  SHOPIFY_SCOPES: string;
  SHOPIFY_API_VERSION: string;
  SHOPIFY_REDIRECT_URI: string;

  // opcional
  LOG_LEVEL?: "debug" | "info" | "warn" | "error";
};

function required(name: string): string {
  const v = process.env[name];
  if (!v || String(v).trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(v);
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  if (!v || String(v).trim() === "") return undefined;
  return String(v);
}

function numberWithDefault(name: string, def: number): number {
  const v = optional(name);
  if (!v) return def;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`Invalid number for env var ${name}: ${v}`);
  return n;
}

function envEnum<T extends string>(name: string, allowed: readonly T[], def: T): T {
  const v = (optional(name) ?? def) as T;
  if (!allowed.includes(v)) {
    throw new Error(`Invalid ${name}: ${v}. Allowed: ${allowed.join(", ")}`);
  }
  return v;
}

export const env: Env = {
  NODE_ENV: envEnum("NODE_ENV", ["development", "production", "test"] as const, "development"),
  PORT: numberWithDefault("PORT", 3000),

  BASE_URL: required("BASE_URL"),
  PUBLIC_WEB_BASE_URL: optional("PUBLIC_WEB_BASE_URL"),

  DATABASE_URL: required("DATABASE_URL"),
  REDIS_URL: optional("REDIS_URL"),

  SHOPIFY_CLIENT_ID: required("SHOPIFY_CLIENT_ID"),
  SHOPIFY_CLIENT_SECRET: required("SHOPIFY_CLIENT_SECRET"),
  SHOPIFY_SCOPES: optional("SHOPIFY_SCOPES") ?? "read_products,write_products",
  SHOPIFY_API_VERSION: optional("SHOPIFY_API_VERSION") ?? "2024-10",
  SHOPIFY_REDIRECT_URI: required("SHOPIFY_REDIRECT_URI"),

  LOG_LEVEL: (optional("LOG_LEVEL") as Env["LOG_LEVEL"]) ?? undefined,
};
