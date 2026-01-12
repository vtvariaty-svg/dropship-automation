import crypto from "node:crypto";
import { env } from "../../env";

const STATE_COOKIE = "shopify_oauth_state";

export function buildInstallUrl(shop: string, state: string) {
  const params = new URLSearchParams({
    client_id: env.SHOPIFY_API_KEY,
    scope: env.SHOPIFY_SCOPES,
    redirect_uri: `${env.BASE_URL}/shopify/callback`,
    state,
  });

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

export function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function assertValidCallback(query: any, cookies: any) {
  const { hmac, state, shop, code } = query;

  if (!hmac || !state || !shop || !code) {
    throw new Error("Missing OAuth parameters");
  }

  if (!cookies[STATE_COOKIE] || cookies[STATE_COOKIE] !== state) {
    throw new Error("Invalid OAuth state");
  }

  validateHmac(query);

  return { shop, code };
}

function validateHmac(query: any) {
  const { hmac, ...rest } = query;

  const message = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${Array.isArray(rest[key]) ? rest[key].join(",") : rest[key]}`)
    .join("&");

  const generated = crypto
    .createHmac("sha256", env.SHOPIFY_API_SECRET)
    .update(message)
    .digest("hex");

  if (generated !== hmac) {
    throw new Error("Invalid HMAC");
  }
}

export async function exchangeCodeForToken(shop: string, code: string) {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.SHOPIFY_API_KEY,
      client_secret: env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for token");
  }

  return response.json() as Promise<{ access_token: string; scope: string }>;
}

export const stateCookieName = STATE_COOKIE;
