// apps/api/src/env.ts
// Env loader sem zod: simples, tipado e com defaults seguros para Render/Shopify.

export type LogLevel = "error" | "warn" | "info" | "debug";

export type Env = {
  NODE_ENV: "test" | "development" | "production";
  PORT: number;

  // URL pública do backend (Render)
  BASE_URL: string;

  // Banco/Cache
  DATABASE_URL: string;
  REDIS_URL?: string;

  // Shopify
  SHOPIFY_CLIENT_ID: string;
  SHOPIFY_CLIENT_SECRET: string;
  SHOPIFY_SCOPES: string;
  SHOPIFY_API_VERSION: string;
  SHOPIFY_REDIRECT_URI: string;

  // Logs
  LOG_LEVEL: LogLevel;
};

function must(name: string): string {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`Missing env var: ${name}`);
  }
  return String(v).trim();
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  const s = v ? String(v).trim() : "";
  return s ? s : undefined;
}

function asNodeEnv(v: string): Env["NODE_ENV"] {
  if (v === "test" || v === "development" || v === "production") return v;
  // se vier algo estranho no Render, cai em production por segurança
  return "production";
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || !String(raw).trim()) return fallback;

  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid env var: ${name} (expected positive number, got "${raw}")`);
  }
  return Math.floor(n);
}

// --------- build do env ---------
const NODE_ENV = asNodeEnv(process.env.NODE_ENV ?? "development");

// Render sempre injeta PORT (na maioria dos casos), mas no local pode não ter.
const PORT = intFromEnv("PORT", 3000);

// BASE_URL precisa existir (é o host público do Render)
// Ex: https://cliquebuy-automation-api.onrender.com
const BASE_URL =
  optional("BASE_URL") ??
  // compat opcional caso você use esse nome
  optional("PUBLIC_WEB_BASE_URL");

if (!BASE_URL) {
  // erro bem claro no log do Render
  throw new Error(
    `Invalid environment variables:\n{\n  "BASE_URL": { "_errors": ["Invalid input: expected string, received undefined"] }\n}\n` +
      `Dica: defina BASE_URL no Render (ex: https://seu-servico.onrender.com)`
  );
}

const DATABASE_URL = must("DATABASE_URL");
const REDIS_URL = optional("REDIS_URL");

// Shopify: aceita os dois estilos (CLIENT_* novo e API_* antigo)
const SHOPIFY_CLIENT_ID = optional("SHOPIFY_CLIENT_ID") ?? optional("SHOPIFY_API_KEY");
if (!SHOPIFY_CLIENT_ID) throw new Error(`Missing env var: SHOPIFY_CLIENT_ID (or SHOPIFY_API_KEY)`);

const SHOPIFY_CLIENT_SECRET =
  optional("SHOPIFY_CLIENT_SECRET") ?? optional("SHOPIFY_API_SECRET") ?? optional("SHOPIFY_API_SECRET_KEY");
if (!SHOPIFY_CLIENT_SECRET) throw new Error(`Missing env var: SHOPIFY_CLIENT_SECRET (or SHOPIFY_API_SECRET)`);

const SHOPIFY_SCOPES = optional("SHOPIFY_SCOPES") ?? "read_products,write_products";
const SHOPIFY_API_VERSION = optional("SHOPIFY_API_VERSION") ?? "2024-10";

// Se não setar, monta automaticamente
const SHOPIFY_REDIRECT_URI =
  optional("SHOPIFY_REDIRECT_URI") ?? `${BASE_URL.replace(/\/+$/, "")}/shopify/callback`;

const LOG_LEVEL = (optional("LOG_LEVEL") as LogLevel) ?? "info";

// Export final tipado (PORT sempre number)
export const env: Env = {
  NODE_ENV,
  PORT,
  BASE_URL,
  DATABASE_URL,
  REDIS_URL,

  SHOPIFY_CLIENT_ID,
  SHOPIFY_CLIENT_SECRET,
  SHOPIFY_SCOPES,
  SHOPIFY_API_VERSION,
  SHOPIFY_REDIRECT_URI,

  LOG_LEVEL,
};
