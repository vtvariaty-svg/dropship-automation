// apps/api/src/env.ts
/* eslint-disable no-console */

type NodeEnv = "development" | "production" | "test";
type LogLevel = "debug" | "info" | "warn" | "error";

function must(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === null || String(v).trim() === "") {
    throw new Error(`Missing env var: ${name}`);
  }
  return String(v).trim();
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  const s = v === undefined || v === null ? "" : String(v).trim();
  return s ? s : undefined;
}

function toNumber(name: string, fallback: number): number {
  const raw = optional(name);
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid env var: ${name} must be a number. Received: ${raw}`);
  }
  return n;
}

function normalizeBaseUrl(url: string): string {
  // remove trailing slash
  return url.replace(/\/+$/, "");
}

function inferRedirectUri(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/shopify/callback`;
}

const NODE_ENV = (optional("NODE_ENV") as NodeEnv) ?? "development";
const PORT = toNumber("PORT", 3000);

// obrigatórias do seu backend
const BASE_URL = normalizeBaseUrl(must("BASE_URL"));
const DATABASE_URL = must("DATABASE_URL");

// (muito usado pelo front/web, mas você já tem no Render)
const PUBLIC_WEB_BASE_URL = normalizeBaseUrl(optional("PUBLIC_WEB_BASE_URL") ?? BASE_URL);

// filas/queues (se seu projeto usa Bull/Redis, deixa obrigatório)
const REDIS_URL = must("REDIS_URL");

// Shopify (novos nomes)
const SHOPIFY_CLIENT_ID = must("SHOPIFY_CLIENT_ID");
const SHOPIFY_CLIENT_SECRET = must("SHOPIFY_CLIENT_SECRET");
const SHOPIFY_SCOPES = must("SHOPIFY_SCOPES");
const SHOPIFY_API_VERSION = must("SHOPIFY_API_VERSION");

// redirect pode vir do Render, mas se não vier a gente calcula pelo BASE_URL
const SHOPIFY_REDIRECT_URI = normalizeBaseUrl(optional("SHOPIFY_REDIRECT_URI") ?? inferRedirectUri(BASE_URL));

// compatibilidade com nomes antigos (pra não quebrar imports existentes)
const SHOPIFY_API_KEY = optional("SHOPIFY_API_KEY") ?? SHOPIFY_CLIENT_ID;
const SHOPIFY_API_SECRET = optional("SHOPIFY_API_SECRET") ?? SHOPIFY_CLIENT_SECRET;

// log
const LOG_LEVEL = (optional("LOG_LEVEL") as LogLevel) ?? "info";

export const env = {
  NODE_ENV,
  PORT,
  BASE_URL,
  PUBLIC_WEB_BASE_URL,
  DATABASE_URL,
  REDIS_URL,

  // Shopify (canon)
  SHOPIFY_CLIENT_ID,
  SHOPIFY_CLIENT_SECRET,
  SHOPIFY_SCOPES,
  SHOPIFY_API_VERSION,
  SHOPIFY_REDIRECT_URI,

  // Shopify (aliases compat)
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,

  LOG_LEVEL,
} as const;

export type Env = typeof env;
