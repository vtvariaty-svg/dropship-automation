import crypto from "crypto";
import { env } from "../../env";

export function randomState(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("hex");
}

// Admin GraphQL endpoint do shop (para uso no client.ts)
export function adminGraphQLEndpoint(shop: string): string {
  return `https://${shop}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
}

export function buildInstallUrl(args: { shop: string; state: string }): string {
  const { shop, state } = args;

  const params = new URLSearchParams({
    client_id: env.SHOPIFY_CLIENT_ID,
    scope: env.SHOPIFY_SCOPES,
    redirect_uri: env.SHOPIFY_REDIRECT_URI,
    state,
  });

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

// Validação HMAC do Shopify (querystring assinado)
export function validateHmac(query: Record<string, unknown>): boolean {
  const hmac = String(query.hmac ?? "");
  if (!hmac) return false;

  // Remove hmac e signature antes de assinar
  const entries = Object.entries(query)
    .filter(([k]) => k !== "hmac" && k !== "signature")
    .map(([k, v]) => [k, String(v)] as [string, string]) // 👈 força tupla
    .sort(([a], [b]) => a.localeCompare(b));

  const message = entries.map(([k, v]) => `${k}=${v}`).join("&");

  const digest = crypto
    .createHmac("sha256", env.SHOPIFY_CLIENT_SECRET)
    .update(message)
    .digest("hex");

  // comparação segura
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(hmac, "utf8");
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

export async function exchangeCodeForToken(args: {
  shop: string;
  code: string;
}): Promise<{ access_token: string; scope?: string }> {
  const { shop, code } = args;

  const url = `https://${shop}/admin/oauth/access_token`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: env.SHOPIFY_CLIENT_ID,
      client_secret: env.SHOPIFY_CLIENT_SECRET,
      code,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Shopify token exchange failed (${resp.status}): ${text}`);
  }

  return (await resp.json()) as { access_token: string; scope?: string };
}
