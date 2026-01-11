// apps/api/src/env.ts
/* eslint-disable no-console */

export type Env = {
  NODE_ENV: "development" | "production" | "test";
  PORT: number;

  // Base/public URL of this API (used for redirects, webhooks, etc.)
  BASE_URL: string;

  // Infra
  DATABASE_URL: string;
  REDIS_URL: string;

  // Shopify (support both naming styles)
  SHOPIFY_CLIENT_ID: string;
  SHOPIFY_CLIENT_SECRET: string;

  // Some parts of the codebase may use API_KEY / API_SECRET naming
  SHOPIFY_API_KEY: string;
  SHOPIFY_API_SECRET: string;

  SHOPIFY_SCOPES: string;
  SHOPIFY_API_VERSION: string;

  // OAuth redirect URI (must match exactly what you set in Shopify app)
  SHOPIFY_REDIRECT_URI: string;

  // Optional (nice to have)
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
};

function read(name: string): string | undefined {
  const v = process.env[name];
  if (v === undefined) return undefined;
  const t = String(v).trim();
  return t.length ? t : undefined;
}

function must(name: string, fallback?: string): string {
  const v = read(name) ?? fallback;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function mustInt(name: string, fallback?: number): number {
  const raw = read(name);
  const val = raw ? Number(raw) : fallback;
  if (!Number.isFinite(val)) throw new Error(`Invalid number env var: ${name}`);
  return val;
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

const NODE_ENV = (read("NODE_ENV") ?? "development") as Env["NODE_ENV"];
const PORT = mustInt("PORT", 3000);

// Prefer BASE_URL, but allow common Render fallback envs
const inferredBaseUrl =
  read("BASE_URL") ||
  read("PUBLIC_WEB_BASE_URL") ||
  read("RENDER_EXTERNAL_URL") ||
  `http://localhost:${PORT}`;

const BASE_URL = stripTrailingSlash(inferredBaseUrl);

// Shopify credentials (accept either style)
const SHOPIFY_CLIENT_ID = must("SHOPIFY_CLIENT_ID", read("SHOPIFY_API_KEY"));
const SHOPIFY_CLIENT_SECRET = must(
  "SHOPIFY_CLIENT_SECRET",
  read("SHOPIFY_API_SECRET")
);

// Mirror into API_KEY/SECRET so other modules keep working
const SHOPIFY_API_KEY = SHOPIFY_CLIENT_ID;
const SHOPIFY_API_SECRET = SHOPIFY_CLIENT_SECRET;

const SHOPIFY_SCOPES = must(
  "SHOPIFY_SCOPES",
  "read_products,write_products"
);

const SHOPIFY_API_VERSION = must("SHOPIFY_API_VERSION", "2024-10");

// Default redirect uri to BASE_URL + /shopify/callback if not provided
const SHOPIFY_REDIRECT_URI = stripTrailingSlash(
  must("SHOPIFY_REDIRECT_URI", `${BASE_URL}/shopify/callback`)
);

const LOG_LEVEL = (read("LOG_LEVEL") ?? "info") as Env["LOG_LEVEL"];

export const env: Env = {
  NODE_ENV,
  PORT,
  BASE_URL,
  DATABASE_URL: must("DATABASE_URL"),
  REDIS_URL: must("REDIS_URL"),

  SHOPIFY_CLIENT_ID,
  SHOPIFY_CLIENT_SECRET,
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,

  SHOPIFY_SCOPES,
  SHOPIFY_API_VERSION,
  SHOPIFY_REDIRECT_URI,

  LOG_LEVEL,
};
