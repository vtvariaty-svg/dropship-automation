import crypto from "node:crypto";

export const DEFAULT_API_VERSION = "2024-10";

export function normalizeShop(input: string): string {
  // aceita "https://x.myshopify.com" ou "x.myshopify.com"
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/i, "")
    .toLowerCase();
}

export function adminGraphQLEndpoint(shop: string, apiVersion: string = DEFAULT_API_VERSION) {
  const s = normalizeShop(shop);
  return `https://${s}/admin/api/${apiVersion}/graphql.json`;
}

export function adminRestBase(shop: string, apiVersion: string = DEFAULT_API_VERSION) {
  const s = normalizeShop(shop);
  return `https://${s}/admin/api/${apiVersion}`;
}

/**
 * Verifica HMAC do OAuth (querystring) se você quiser endurecer o callback.
 * OBS: Shopify usa HMAC hex do querystring assinado (sem o parâmetro hmac).
 */
export function verifyOAuthHmac(query: Record<string, any>, clientSecret: string): boolean {
  const { hmac, ...rest } = query;
  if (!hmac || typeof hmac !== "string") return false;

  const message = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${Array.isArray(rest[k]) ? rest[k].join(",") : rest[k]}`)
    .join("&");

  const digest = crypto.createHmac("sha256", clientSecret).update(message).digest("hex");
  return safeEqual(digest, hmac);
}

/**
 * Verificação HMAC do WEBHOOK (base64 do body RAW).
 */
export function verifyWebhookHmac(rawBody: string, hmacHeader: string, clientSecret: string): boolean {
  if (!hmacHeader) return false;

  const digest = crypto.createHmac("sha256", clientSecret).update(rawBody, "utf8").digest("base64");
  return safeEqual(digest, hmacHeader);
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
