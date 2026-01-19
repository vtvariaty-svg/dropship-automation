// apps/api/src/integrations/shopify/oauth.ts

import crypto from "crypto";
import type { ExchangeTokenInput, ExchangeTokenResult, OAuthInstallUrlInput } from "../../platforms/types";

export function normalizeShop(input: string): string {
  const s = String(input || "").trim().toLowerCase();
  if (!s) return "";
  // aceita clique...myshopify.com ou só clique...
  if (s.includes(".myshopify.com")) return s;
  return `${s}.myshopify.com`;
}

export function randomState(len = 16): string {
  return crypto.randomBytes(Math.ceil(len / 2)).toString("hex").slice(0, len);
}

export function buildInstallUrl(args: OAuthInstallUrlInput): string {
  const shop = normalizeShop(args.shop);
  const u = new URL(`https://${shop}/admin/oauth/authorize`);
  u.searchParams.set("client_id", args.clientId);
  u.searchParams.set("scope", args.scopes);
  u.searchParams.set("redirect_uri", args.redirectUri);
  u.searchParams.set("state", args.state);
  return u.toString();
}

export function adminGraphQLEndpoint(shop: string): string {
  const s = normalizeShop(shop);
  return `https://${s}/admin/api/${process.env.SHOPIFY_API_VERSION || "2024-10"}/graphql.json`;
}

/**
 * HMAC do OAuth (querystring). Assinatura compatível com seus erros:
 * verifyHmac(query, secret)
 */
export function verifyHmac(query: Record<string, any>, secret: string): boolean {
  const q = { ...query };
  const provided = String(q.hmac || "");
  delete q.hmac;
  delete q.signature;

  const message = Object.keys(q)
    .sort()
    .map((k) => `${k}=${Array.isArray(q[k]) ? q[k].join(",") : q[k]}`)
    .join("&");

  const digest = crypto.createHmac("sha256", secret).update(message).digest("hex");
  return safeEqual(digest, provided);
}

/**
 * HMAC do webhook (header X-Shopify-Hmac-Sha256)
 */
export function verifyWebhookHmac(rawBody: string, signatureHeader: string, secret: string): boolean {
  const computed = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  return safeEqual(computed, String(signatureHeader || ""));
}

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export async function exchangeCodeForToken(input: ExchangeTokenInput): Promise<ExchangeTokenResult> {
  const shop = normalizeShop(input.shop);

  const url = `https://${shop}/admin/oauth/access_token`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
    }),
  });

  const json = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(`Shopify token exchange failed: ${JSON.stringify(json)}`);
  }

  // Shopify retorna "scope" singular — aqui normalizamos para "scopes"
  return {
    accessToken: String(json.access_token || ""),
    scopes: String(json.scope || ""),
  };
}
