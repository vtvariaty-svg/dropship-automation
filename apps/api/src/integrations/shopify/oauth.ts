import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../../env";

/**
 * OAuth helpers.
 *
 * IMPORTANT:
 * - Keep this module side-effect free (no top-level await / writes).
 * - For the OAuth callback validation, Shopify sends the HMAC as HEX.
 */

export function normalizeShopDomain(shop: string): string {
  const s = (shop ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s.endsWith(".myshopify.com")) return s;
  return `${s}.myshopify.com`;
}

export function buildAdminGraphQLEndpoint(
  shop: string,
  apiVersion: string = env.SHOPIFY_API_VERSION
): string {
  const domain = normalizeShopDomain(shop);
  return `https://${domain}/admin/api/${apiVersion}/graphql.json`;
}

export function buildAdminRestBase(
  shop: string,
  apiVersion: string = env.SHOPIFY_API_VERSION
): string {
  const domain = normalizeShopDomain(shop);
  return `https://${domain}/admin/api/${apiVersion}`;
}

export function generateOauthState(): string {
  return randomBytes(16).toString("hex");
}

export function buildInstallUrlWithOptions(opts: {
  shop: string;
  state: string;
  redirectUri: string;
  scopes?: string;
}): string {
  const shop = normalizeShopDomain(opts.shop);
  const scope = (opts.scopes ?? env.SHOPIFY_SCOPES)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(",");

  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", env.SHOPIFY_CLIENT_ID);
  url.searchParams.set("scope", scope);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("state", opts.state);
  return url.toString();
}

/**
 * Shopify OAuth callback HMAC validation.
 *
 * Shopify signs the query string (excluding `hmac` and `signature`), sorted by key.
 */
export function validateOauthHmac(rawQuery: Record<string, unknown>): boolean {
  const query: Record<string, unknown> = { ...rawQuery };
  const hmac = query.hmac;
  delete query.hmac;
  delete query.signature;

  if (typeof hmac !== "string" || !hmac) return false;

  const message = Object.keys(query)
    .filter((k) => query[k] !== undefined && query[k] !== null)
    .sort()
    .map((k) => {
      const v = query[k];
      if (Array.isArray(v)) return `${k}=${v.join(",")}`;
      return `${k}=${String(v)}`;
    })
    .join("&");

  const computed = createHmac("sha256", env.SHOPIFY_CLIENT_SECRET)
    .update(message)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(computed, "utf8"),
      Buffer.from(hmac, "utf8")
    );
  } catch {
    return false;
  }
}

export async function exchangeCodeForTokenWithOptions(opts: {
  shop: string;
  code: string;
}): Promise<{ access_token: string; scope?: string }> {
  const shop = normalizeShopDomain(opts.shop);
  const url = `https://${shop}/admin/oauth/access_token`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.SHOPIFY_CLIENT_ID,
      client_secret: env.SHOPIFY_CLIENT_SECRET,
      code: opts.code,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Shopify token exchange failed (${res.status}): ${text}`);
  }

  return (await res.json()) as { access_token: string; scope?: string };
}

/* ------------------------------------------------------------------ */
/* Backwards-compatible exports (pra não quebrar seus routes atuais)   */
/* ------------------------------------------------------------------ */

export function isValidShop(shop: string): boolean {
  const normalized = normalizeShopDomain(shop);
  return normalized.length > 0 && normalized.endsWith(".myshopify.com");
}

export function randomState(): string {
  return generateOauthState();
}

export function verifyHmac(query: Record<string, unknown>): boolean {
  return validateOauthHmac(query);
}

/**
 * Compatível com routes antigos: buildInstallUrl(shop, state)
 * Usa BASE_URL + /shopify/callback como redirect.
 */
export function buildInstallUrl(shop: string, state: string): string {
  const redirectUri = `${env.BASE_URL}/shopify/callback`;
  return buildInstallUrlWithOptions({ shop, state, redirectUri });
}

/**
 * Compatível com routes antigos: exchangeCodeForToken(shop, code) => accessToken string
 */
export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<string> {
  const { access_token } = await exchangeCodeForTokenWithOptions({ shop, code });
  return access_token;
}
