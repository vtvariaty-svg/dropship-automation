import crypto from "node:crypto";
import { env } from "../../env";

/* =========================
   CONSTANTES
========================= */

export const DEFAULT_API_VERSION = "2024-10";

/* =========================
   SHOP HELPERS
========================= */

export function normalizeShop(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/i, "")
    .toLowerCase();
}

export function isValidShop(shop: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);
}

export function randomState(): string {
  return crypto.randomBytes(16).toString("hex");
}

/* =========================
   URLS
========================= */

export function adminGraphQLEndpoint(
  shop: string,
  apiVersion: string = DEFAULT_API_VERSION
) {
  return `https://${normalizeShop(
    shop
  )}/admin/api/${apiVersion}/graphql.json`;
}

export function buildInstallUrl(params: {
  shop: string;
  state: string;
  scopes: string;
  redirectUri: string;
}) {
  const shop = normalizeShop(params.shop);

  const qs = new URLSearchParams({
    client_id: env.SHOPIFY_CLIENT_ID,
    scope: params.scopes,
    redirect_uri: params.redirectUri,
    state: params.state,
  });

  return `https://${shop}/admin/oauth/authorize?${qs.toString()}`;
}

/* =========================
   OAUTH TOKEN
========================= */

export async function exchangeCodeForToken(params: {
  shop: string;
  code: string;
}) {
  const res = await fetch(
    `https://${normalizeShop(params.shop)}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.SHOPIFY_CLIENT_ID,
        client_secret: env.SHOPIFY_CLIENT_SECRET,
        code: params.code,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`OAuth token exchange failed: ${res.status}`);
  }

  return res.json() as Promise<{
    access_token: string;
    scope: string;
  }>;
}

/* =========================
   HMAC
========================= */

export function verifyHmac(
  rawBody: string,
  hmacHeader: string,
  secret: string
): boolean {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  return safeEqual(digest, hmacHeader);
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
