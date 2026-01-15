// apps/api/src/integrations/shopify/oauth.ts
import crypto from "node:crypto";
import { env } from "../../env";
import { ShopifyAdminClient } from "./adminClient";
import { saveShopToken } from "./store";
import { ensureWebhooks } from "./webhookRegistrar";

export const SHOPIFY_STATE_COOKIE = "shopify_state";

// Mantém um default estável, e também permite override via env.
export const DEFAULT_API_VERSION = env.SHOPIFY_API_VERSION ?? "2024-10";

/** remove https://, trailing slash, espaços, e força lowercase */
export function normalizeShop(input: string): string {
  const s = (input ?? "").trim().toLowerCase();
  const noProto = s.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return noProto;
}

export function isValidShop(shop: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);
}

export function randomState(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function adminGraphQLEndpoint(shop: string): string {
  const apiVersion = env.SHOPIFY_API_VERSION ?? DEFAULT_API_VERSION;
  return `https://${shop}/admin/api/${apiVersion}/graphql.json`;
}

/**
 * OAuth Install URL
 * scopes: env.SHOPIFY_SCOPES (csv) ou string que você passar
 */
export function buildInstallUrl(args: {
  shop: string;
  state: string;
  redirectUri: string;
  scopes?: string;
  clientId?: string;
}): string {
  const shop = normalizeShop(args.shop);
  const clientId = args.clientId ?? env.SHOPIFY_CLIENT_ID;
  const scope = args.scopes ?? env.SHOPIFY_SCOPES;

  const u = new URL(`https://${shop}/admin/oauth/authorize`);
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("scope", scope);
  u.searchParams.set("redirect_uri", args.redirectUri);
  u.searchParams.set("state", args.state);

  // recomendado em alguns fluxos
  u.searchParams.set("grant_options[]", "per-user");

  return u.toString();
}

/**
 * Verifica HMAC do OAuth callback (querystring).
 * Shopify envia `hmac` e o resto assina com secret.
 */
export function verifyHmac(query: Record<string, any>, secret: string): boolean {
  const q = { ...query };

  const hmac = String(q.hmac ?? "");
  delete q.hmac;
  delete q.signature; // legacy

  const message = Object.keys(q)
    .sort()
    .map((k) => `${k}=${Array.isArray(q[k]) ? q[k].join(",") : String(q[k])}`)
    .join("&");

  const digest = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  // timing safe
  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest, "utf8"),
      Buffer.from(hmac, "utf8")
    );
  } catch {
    return false;
  }
}

/**
 * Verifica HMAC de Webhook (base64) usando o RAW body (string exata).
 */
export function verifyWebhookHmac(rawBody: string, hmacHeader: string, secret: string): boolean {
  const computed = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, "utf8"),
      Buffer.from(String(hmacHeader ?? ""), "utf8")
    );
  } catch {
    return false;
  }
}

/**
 * Troca code por access_token
 */
export async function exchangeCodeForToken(args: {
  shop: string;
  code: string;
  clientId?: string;
  clientSecret?: string;
}): Promise<string> {
  const shop = normalizeShop(args.shop);
  const clientId = args.clientId ?? env.SHOPIFY_CLIENT_ID;
  const clientSecret = args.clientSecret ?? env.SHOPIFY_CLIENT_SECRET;

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: args.code,
    }),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(`Shopify token exchange failed (${res.status}): ${JSON.stringify(data)}`);
  }

  if (!data?.access_token) {
    throw new Error(`Shopify token exchange missing access_token: ${JSON.stringify(data)}`);
  }

  return String(data.access_token);
}

/**
 * Fluxo final: salva token + registra webhooks
 */
export async function finalizeInstall(args: {
  shop: string;
  accessToken: string;
  scope?: string | null;
}): Promise<void> {
  await saveShopToken({
    shop: args.shop,
    accessToken: args.accessToken,
    scope: args.scope ?? null,
  });

  const client = new ShopifyAdminClient({
    shop: args.shop,
    accessToken: args.accessToken,
  });

  await ensureWebhooks(client);
}
