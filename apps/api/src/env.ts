// apps/api/src/env.ts
// Loader de variáveis de ambiente simples, seguro e compatível com Render + Shopify

export type LogLevel = "error" | "warn" | "info" | "debug";

export type Env = {
  NODE_ENV: "test" | "development" | "production";
  PORT: number;

  // URLs
  BASE_URL: string;
  PUBLIC_WEB_BASE_URL?: string;

  // Infra
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

// helpers
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function numberEnv(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return parsed;
}

// ===============================
// EXPORT FINAL DO ENV
// ===============================
export const env: Env = {
  NODE_ENV: (process.env.NODE_ENV as Env["NODE_ENV"]) ?? "development",

  PORT: numberEnv("PORT", 3000),

  // URLs
  BASE_URL: required("BASE_URL"),
  PUBLIC_WEB_BASE_URL: process.env.PUBLIC_WEB_BASE_URL,

  // Infra
  DATABASE_URL: required("DATABASE_URL"),
  REDIS_URL: process.env.REDIS_URL,

  // Shopify
  SHOPIFY_CLIENT_ID: required("SHOPIFY_CLIENT_ID"),
  SHOPIFY_CLIENT_SECRET: required("SHOPIFY_CLIENT_SECRET"),
  SHOPIFY_SCOPES: required("SHOPIFY_SCOPES"),
  SHOPIFY_API_VERSION: required("SHOPIFY_API_VERSION"),
  SHOPIFY_REDIRECT_URI: required("SHOPIFY_REDIRECT_URI"),

  // Logs
  LOG_LEVEL: (process.env.LOG_LEVEL as LogLevel) ?? "info",
};
