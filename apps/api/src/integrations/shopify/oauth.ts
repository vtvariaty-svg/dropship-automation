import crypto from "crypto";
import { env } from "../../env";

export function randomState() {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Shopify HMAC validation
 */
export function verifyHmac(query: Record<string, any>) {
  const { hmac, ...rest } = query;
  if (!hmac) return false;

  const message = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("&");

  const digest = crypto
    .createHmac("sha256", env.SHOPIFY_CLIENT_SECRET)
    .update(message)
    .digest("hex");

  return digest === hmac;
}

export function buildInstallUrl(params: {
  shop: string;
  state: string;
  redirectUri: string;
}) {
  const { shop, state, redirectUri } = params;

  return (
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${encodeURIComponent(env.SHOPIFY_CLIENT_ID)}` +
    `&scope=${encodeURIComponent(env.SHOPIFY_SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`
  );
}

export function adminGraphQLEndpoint(shop: string) {
  return `https://${shop}/admin/api/2024-10/graphql.json`;
}
