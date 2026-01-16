// apps/api/src/integrations/shopify/oauth.ts
import crypto from "node:crypto";
import { env } from "../../env";
import { ShopifyAdminClient } from "./adminClient";
import { saveShopToken } from "./store";
import { ensureCoreWebhooks } from "./webhookRegistrar";

export const SHOPIFY_STATE_COOKIE = "shopify_state";
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

/** state randômico para OAuth (hex) */
export function randomState(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("hex");
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
  const scopes = args.scopes ?? env.SHOPIFY_SCOPES;

  const u = new URL(`https://${shop}/admin/oauth/authorize`);
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("scope", scopes);
  u.searchParams.set("redirect_uri", args.redirectUri);
  u.searchParams.set("state", args.state);

  // recomendado em alguns fluxos
  u.searchParams.set("grant_options[]", "per-user");

  return u.toString();
}

/**
 * Verifica HMAC do OAuth callback (querystring).
 */
export function verifyHmac(query: Record<string, any>, secret: string): boolean;
export function verifyHmac(args: { query: Record<string, any>; clientSecret: string }): boolean;
export function verifyHmac(
  a: Record<string, any> | { query: Record<string, any>; clientSecret: string },
  b?: string
): boolean {
  const query = ("query" in a ? a.query : a) as Record<string, any>;
  const secret = ("query" in a ? a.clientSecret : b) as string;

  const q = { ...query };

  const hmac = String(q.hmac ?? "");
  delete q.hmac;
  delete q.signature; // legacy

  const message = Object.keys(q)
    .sort()
    .map((k) => `${k}=${Array.isArray(q[k]) ? q[k].join(",") : String(q[k])}`)
    .join("&");

  const digest = crypto.createHmac("sha256", secret).update(message).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(digest, "utf8"), Buffer.from(hmac, "utf8"));
  } catch {
    return false;
  }
}

/**
 * Verifica HMAC de Webhook (base64) usando o RAW body (string exata).
 */
export function verifyWebhookHmac(rawBody: string, hmacHeader: string, secret: string): boolean;
export function verifyWebhookHmac(args: { rawBody: string; hmacHeader: string; secret: string }): boolean;
export function verifyWebhookHmac(
  a: string | { rawBody: string; hmacHeader: string; secret: string },
  b?: string,
  c?: string
): boolean {
  const rawBody = typeof a === "string" ? a : a.rawBody;
  const hmacHeader = typeof a === "string" ? String(b ?? "") : String(a.hmacHeader ?? "");
  const secret = typeof a === "string" ? String(c ?? "") : String(a.secret ?? "");

  const computed = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");

  try {
    return crypto.timingSafeEqual(Buffer.from(computed, "utf8"), Buffer.from(hmacHeader, "utf8"));
  } catch {
    return false;
  }
}

/**
 * Troca code por access_token
 * ✅ Padronizado para retornar { scopes } (plural) porque é o contrato usado no repo/DB.
 */
export async function exchangeCodeForToken(args: {
  shop: string;
  code: string;
  clientId?: string;
  clientSecret?: string;
}): Promise<{ access_token: string; scopes: string | null }> {
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

  return {
    access_token: String(data.access_token),
    // Shopify retorna "scope" (singular) — nós persistimos como "scopes" (plural)
    scopes: data?.scope ? String(data.scope) : null,
  };
}

/**
 * Fluxo final: salva token + registra webhooks
 * ✅ Padronizado para { scopes } (plural)
 */
export async function finalizeInstall(args: {
  shop: string;
  accessToken: string;
  scopes?: string | null;
}): Promise<void> {
  await saveShopToken({
    shop: args.shop,
    accessToken: args.accessToken,
    scopes: args.scopes ?? null,
  });

  const client = new ShopifyAdminClient({
    shop: args.shop,
    accessToken: args.accessToken,
  });

  await ensureCoreWebhooks({ client, callbackBaseUrl: env.BASE_URL });
}
