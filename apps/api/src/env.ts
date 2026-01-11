// apps/api/src/env.ts

type NodeEnv = "development" | "production" | "test";

function pickEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

function required(name: string, ...aliases: string[]): string {
  const v = pickEnv(name, ...aliases);
  if (!v) {
    const all = [name, ...aliases].join(" | ");
    throw new Error(`Missing required environment variable: ${all}`);
  }
  return v;
}

function optional(name: string, ...aliases: string[]): string | undefined {
  return pickEnv(name, ...aliases);
}

function normalizeBaseUrl(url: string): string {
  // remove trailing slash
  return url.replace(/\/+$/, "");
}

function parsePort(value: string | undefined, fallback = 10000): number {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

// --- required / derived values ---

// Prefer BASE_URL, but accept common alternatives on Render
const BASE_URL = normalizeBaseUrl(
  required("BASE_URL", "PUBLIC_WEB_BASE_URL", "RENDER_EXTERNAL_URL")
);

// Shopify credentials: support both naming styles
const SHOPIFY_CLIENT_ID = required("SHOPIFY_CLIENT_ID", "SHOPIFY_API_KEY");
const SHOPIFY_CLIENT_SECRET = required(
  "SHOPIFY_CLIENT_SECRET",
  "SHOPIFY_API_SECRET",
  "SHOPIFY_API_SECRET_KEY"
);

// Scopes + version (provide sane defaults if missing)
const SHOPIFY_SCOPES =
  optional("SHOPIFY_SCOPES") ?? "read_products,write_products";

const SHOPIFY_API_VERSION =
  optional("SHOPIFY_API_VERSION") ?? "2024-10";

// Redirect URI:
// If not set, derive from BASE_URL (recommended) => `${BASE_URL}/shopify/callback`
// Also accept common alias names.
const SHOPIFY_REDIRECT_URI =
  optional("SHOPIFY_REDIRECT_URI", "SHOPIFY_REDIRECT_URL", "SHOPIFY_CALLBACK_URL") ??
  `${BASE_URL}/shopify/callback`;

// DB must exist
const DATABASE_URL = required("DATABASE_URL");

// Redis is optional
const REDIS_URL = optional("REDIS_URL");

// Node env + port
const NODE_ENV = (optional("NODE_ENV") ?? "production") as NodeEnv;
const PORT = parsePort(process.env.PORT, 10000);

// Public web base url (optional)
const PUBLIC_WEB_BASE_URL = optional("PUBLIC_WEB_BASE_URL") ?? BASE_URL;

export const env = {
  NODE_ENV,
  PORT,
  BASE_URL,
  PUBLIC_WEB_BASE_URL,

  DATABASE_URL,
  REDIS_URL,

  SHOPIFY_CLIENT_ID,
  SHOPIFY_CLIENT_SECRET,
  SHOPIFY_SCOPES,
  SHOPIFY_API_VERSION,
  SHOPIFY_REDIRECT_URI,
} as const;

export type Env = typeof env;
