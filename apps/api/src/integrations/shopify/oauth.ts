import crypto from "node:crypto";
import { env } from "../../env";

export function randomState(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function isValidShop(shop: unknown): shop is string {
  if (typeof shop !== "string") return false;
  // Aceita myshopify.com e também subdomínios dev
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop);
}

/**
 * Verifica HMAC do OAuth (querystring) conforme Shopify.
 * - Remove 'hmac' e 'signature'
 * - Ordena params
 * - Concatena como "k=v&k2=v2"
 * - HMAC-SHA256 usando SHOPIFY_CLIENT_SECRET e compara em hex
 */
export function verifyHmac(query: Record<string, unknown>): boolean {
  const hmac = typeof query.hmac === "string" ? query.hmac : "";
  if (!hmac) return false;

  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (k === "hmac" || k === "signature") continue;
    if (v == null) continue;
    filtered[k] = String(v);
  }

  const message = Object.keys(filtered)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(filtered[k]).replace(/%20/g, "+")}`)
    .join("&");

  const digest = crypto
    .createHmac("sha256", env.SHOPIFY_CLIENT_SECRET)
    .update(message)
    .digest("hex");

  // timingSafeEqual exige mesmo tamanho
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
  } catch {
    return false;
  }
}

export function buildInstallUrl(shop: string, state: string) {
  const redirectUri = `${env.BASE_URL}/shopify/callback`;
  const scopes = env.SHOPIFY_SCOPES;

  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", env.SHOPIFY_CLIENT_ID);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForToken(params: { shop: string; code: string }) {
  const url = new URL(`https://${params.shop}/admin/oauth/access_token`);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.SHOPIFY_CLIENT_ID,
      client_secret: env.SHOPIFY_CLIENT_SECRET,
      code: params.code,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Shopify token exchange failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { access_token: string; scope?: string };
  return {
    accessToken: data.access_token,
    scope: data.scope ?? null,
  };
}
