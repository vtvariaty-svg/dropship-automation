// apps/api/src/integrations/shopify/oauth.ts
import crypto from "node:crypto";
import { env } from "../../env";

export function normalizeShop(input: string): string {
  const shop = String(input || "").trim().toLowerCase();

  // aceita "minhaloja" e vira "minhaloja.myshopify.com"
  if (shop && !shop.includes(".")) return `${shop}.myshopify.com`;

  return shop;
}

export function validateShopParam(shop: string): void {
  // Shopify recomenda validar domínio .myshopify.com
  // Ex: cliqueuydev.myshopify.com
  const ok = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);
  if (!ok) throw new Error(`Invalid shop param: ${shop}`);
}

export function randomState(len = 16): string {
  return crypto.randomBytes(len).toString("hex");
}

export function verifyHmac(query: Record<string, any>, secret: string): boolean {
  // Shopify HMAC: remove hmac e signature, ordena e cria querystring
  const { hmac, signature, ...rest } = query || {};
  if (!hmac) return false;

  const message = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${Array.isArray(rest[k]) ? rest[k].join(",") : rest[k]}`)
    .join("&");

  const digest = crypto.createHmac("sha256", secret).update(message).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest, "utf8"), Buffer.from(String(hmac), "utf8"));
}

export function buildInstallUrl(shopRaw: string, state: string): string {
  const shop = normalizeShop(shopRaw);
  validateShopParam(shop);

  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", env.SHOPIFY_CLIENT_ID);
  url.searchParams.set("scope", env.SHOPIFY_SCOPES);
  url.searchParams.set("redirect_uri", env.SHOPIFY_REDIRECT_URI);
  url.searchParams.set("state", state);
  url.searchParams.set("grant_options[]", "per-user"); // opcional, mas ok
  return url.toString();
}

export function adminGraphQLEndpoint(shopRaw: string): string {
  const shop = normalizeShop(shopRaw);
  validateShopParam(shop);
  return `https://${shop}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
}
