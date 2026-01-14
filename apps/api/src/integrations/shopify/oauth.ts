import crypto from "node:crypto";
import { env } from "../../env";
import { ShopifyAdminClient } from "./adminClient";
import { ensureWebhooks } from "./webhookRegistrar";

// Cookie único e estável para o state do OAuth.
// Mantém consistência entre /install e /callback.
export const SHOPIFY_STATE_COOKIE = "shopify_state";

/* ------------------ helpers ------------------ */

export function isValidShop(shop: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);
}

export function randomState(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/* ------------------ OAuth ------------------ */

export function buildInstallUrl(shop: string, state: string): string {
  if (!isValidShop(shop)) {
    throw new Error(`Invalid shop domain: ${shop}`);
  }

  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", env.SHOPIFY_CLIENT_ID);
  url.searchParams.set("scope", env.SHOPIFY_SCOPES);
  url.searchParams.set("redirect_uri", env.SHOPIFY_REDIRECT_URI);
  url.searchParams.set("state", state);
  url.searchParams.set("grant_options[]", "per-user");

  return url.toString();
}

/**
 * Verifica o HMAC do querystring do callback (/shopify/callback).
 * Regras Shopify:
 * - remover "signature" se existir
 * - remover "hmac"
 * - ordenar chaves
 * - montar query "key=value&key2=value2"
 * - HMAC-SHA256 com SHOPIFY_CLIENT_SECRET
 */
export function verifyHmac(query: Record<string, unknown>, hmac: string): boolean {
  const message = Object.keys(query)
    .filter((k) => k !== "hmac" && k !== "signature")
    .sort()
    .map((key) => {
      const value = query[key];
      if (Array.isArray(value)) {
        return value.map((v) => `${key}=${String(v)}`).join("&");
      }
      return `${key}=${String(value)}`;
    })
    .join("&");

  const digest = crypto
    .createHmac("sha256", env.SHOPIFY_CLIENT_SECRET)
    .update(message)
    .digest("hex");

  // timingSafeEqual exige buffers de mesmo tamanho.
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(hmac, "utf8");
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

export async function exchangeCodeForToken(shop: string, code: string): Promise<string> {
  if (!isValidShop(shop)) {
    throw new Error(`Invalid shop domain: ${shop}`);
  }

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.SHOPIFY_CLIENT_ID,
      client_secret: env.SHOPIFY_CLIENT_SECRET,
      code,
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Token exchange failed (${res.status}): ${txt}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("No access_token returned by Shopify");
  }

  return data.access_token;
}

/**
 * ✅ Chame isso no /shopify/callback DEPOIS de persistir o token.
 * Evita top-level await e garante que shop/accessToken existem.
 */
export async function registerWebhooksForShop(shop: string, accessToken: string): Promise<void> {
  if (!isValidShop(shop)) {
    throw new Error(`Invalid shop domain: ${shop}`);
  }
  if (!accessToken) {
    throw new Error("Missing accessToken");
  }

  const client = new ShopifyAdminClient({
    shop,
    accessToken,
  });

  await ensureWebhooks(client);
}

/* ------------------ API endpoints ------------------ */

export function adminGraphQLEndpoint(shop: string): string {
  return `https://${shop}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
}
