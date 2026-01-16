// apps/api/src/integrations/shopify/oauth.ts
import crypto from "node:crypto";
import { env } from "../../env";

/* =========================
   Helpers básicos
========================= */

export function normalizeShop(input: string): string {
  const s = (input ?? "").trim().toLowerCase();
  return s.replace(/^https?:\/\//, "").replace(/\/+$/, "");
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

  const u = new URL(`https://${shop}/admin/oauth/authorize`);
  u.searchParams.set("client_id", args.clientId);
  u.searchParams.set("scope", args.scopes);
  u.searchParams.set("redirect_uri", args.redirectUri);
  u.searchParams.set("state", args.state);

  return u.toString();
}

/* =========================
   Admin GraphQL endpoint
========================= */

export function adminGraphQLEndpoint(shop: string): string {
  const apiVersion = env.SHOPIFY_API_VERSION ?? "2024-10";
  return `https://${normalizeShop(shop)}/admin/api/${apiVersion}/graphql.json`;
}

/* =========================
   HMAC OAuth callback
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
   Webhook HMAC (raw body)
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
