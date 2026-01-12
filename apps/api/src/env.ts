import { config } from "dotenv";
config();

function req(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v.trim();
}

function opt(name: string, def?: string): string | undefined {
  const v = process.env[name];
  if (!v || v.trim() === "") return def;
  return v.trim();
}

function num(name: string, def: number): number {
  const v = opt(name);
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Env ${name} must be a number`);
  return n;
}

export const env = {
  NODE_ENV: (opt("NODE_ENV", "development") as
    | "development"
    | "test"
    | "production"),

  PORT: num("PORT", 3000),

  BASE_URL: opt("BASE_URL") ?? req("PUBLIC_WEB_BASE_URL"),
  PUBLIC_WEB_BASE_URL: opt("PUBLIC_WEB_BASE_URL"),

  DATABASE_URL: req("DATABASE_URL"),
  REDIS_URL: opt("REDIS_URL"),

  SHOPIFY_CLIENT_ID: req("SHOPIFY_CLIENT_ID"),
  SHOPIFY_CLIENT_SECRET: req("SHOPIFY_CLIENT_SECRET"),
  SHOPIFY_SCOPES: req("SHOPIFY_SCOPES"),
  SHOPIFY_API_VERSION: req("SHOPIFY_API_VERSION"),

  SHOPIFY_REDIRECT_URI:
    opt("SHOPIFY_REDIRECT_URI") ??
    `${opt("BASE_URL") ?? req("PUBLIC_WEB_BASE_URL")}/shopify/callback`,
} as const;

export type Env = typeof env;
