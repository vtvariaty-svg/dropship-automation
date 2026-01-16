// apps/api/src/integrations/shopify/oauth.ts
import crypto from "node:crypto";
import fetch from "node-fetch";
import { env } from "../../env";

/* =========================
   Utils
========================= */

export function normalizeShop(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

export function randomState(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/* =========================
   OAuth URLs
========================= */

export function buildInstallUrl(args: {
  shop: string;
  clientId: string;
  scopes: string;
  redirectUri: string;
  state: string;
}): string {
  const shop = normalizeShop(args.shop);

  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", args.clientId);
  url.searchParams.set("scope", args.scopes);
  url.searchParams.set("redirect_uri", args.redirectUri);
  url.searchParams.set("state", args.state);

  return url.toString();
}

/* =========================
   OAuth Code → Token
========================= */

export async function exchangeCodeForToken(args: {
  shop: string;
  code: string;
}): Promise<{ accessToken: string; scopes: string }> {
  const shop = normalizeShop(args.shop);

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.SHOPIFY_API_KEY,
      client_secret: env.SHOPIFY_API_SECRET,
      code: args.code,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify token exchange failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    scope: string;
  };

  return {
    accessToken: json.access_token,
    scopes: json.scope,
  };
}

/* =========================
   Admin GraphQL endpoint
========================= */

export function adminGraphQLEndpoint(shop: string): string {
  const apiVersion = env.SHOPIFY_API_VERSION ?? "2024-10";
  return `https://${normalizeShop(shop)}/admin/api/${apiVersion}/graphql.json`;
}

/* =========================
   OAuth HMAC validation
========================= */

export function verifyHmac(args: {
  query: Record<string, any>;
  clientSecret: string;
}): boolean {
  const q = { ...args.query };
  const hmac = String(q.hmac ?? "");

  delete q.hmac;
  delete q.signature;

  const message = Object.keys(q)
    .sort()
    .map((k) => `${k}=${Array.isArray(q[k]) ? q[k].join(",") : String(q[k])}`)
    .join("&");

  const digest = crypto
    .createHmac("sha256", args.clientSecret)
    .update(message)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest, "utf8"),
      Buffer.from(hmac, "utf8")
    );
  } catch {
    return false;
  }
}

/* =========================
   Webhook HMAC
========================= */

export function verifyWebhookHmac(args: {
  rawBody: string;
  hmacHeader: string;
  secret: string;
}): boolean {
  const computed = crypto
    .createHmac("sha256", args.secret)
    .update(args.rawBody, "utf8")
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, "utf8"),
      Buffer.from(String(args.hmacHeader ?? ""), "utf8")
    );
  } catch {
    return false;
  }
}
