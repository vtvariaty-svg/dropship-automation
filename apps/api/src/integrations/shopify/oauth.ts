import crypto from "node:crypto";

export const DEFAULT_API_VERSION = process.env.SHOPIFY_API_VERSION || "2024-10";

export function normalizeShop(input: string): string {
  const shop = String(input || "").trim().toLowerCase();

  // Aceita apenas *.myshopify.com
  if (!shop.endsWith(".myshopify.com")) {
    throw new Error("Invalid shop domain. Expected *.myshopify.com");
  }

  // Bloqueia coisas estranhas
  if (shop.includes("/") || shop.includes("?") || shop.includes("#")) {
    throw new Error("Invalid shop domain format");
  }

  return shop;
}

export function randomState(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function buildInstallUrl(params: {
  shop: string;
  clientId: string;
  scopes: string;
  redirectUri: string;
  state: string;
}): string {
  const shop = normalizeShop(params.shop);

  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("scope", params.scopes);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("grant_options[]", "per-user"); // opcional, mas bom padrão

  return url.toString();
}

/**
 * Verifica HMAC do callback OAuth do Shopify.
 * Shopify calcula HMAC sobre query string (exceto hmac e signature).
 */
export function verifyHmac(params: {
  query: Record<string, unknown>;
  clientSecret: string;
}): boolean {
  const { query, clientSecret } = params;

  const provided = String(query.hmac || "");
  if (!provided) return false;

  const entries: [string, string][] = Object.entries(query)
    .filter(([k, v]) => k !== "hmac" && k !== "signature" && v !== undefined && v !== null)
    .map(([k, v]) => [k, Array.isArray(v) ? String(v[0]) : String(v)]);

  entries.sort(([a], [b]) => a.localeCompare(b));

  // Shopify usa & e = normal
  const message = entries.map(([k, v]) => `${k}=${v}`).join("&");

  const digest = crypto
    .createHmac("sha256", clientSecret)
    .update(message, "utf8")
    .digest("hex");

  return timingSafeEqualHex(digest, provided);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

/**
 * Troca code por access_token
 */
export async function exchangeCodeForToken(params: {
  shop: string;
  clientId: string;
  clientSecret: string;
  code: string;
}): Promise<{ access_token: string; scope: string }> {
  const shop = normalizeShop(params.shop);

  const resp = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`OAuth token exchange failed: ${resp.status} ${t}`);
  }

  return (await resp.json()) as { access_token: string; scope: string };
}

/**
 * Verifica HMAC do WEBHOOK (X-Shopify-Hmac-Sha256).
 * Shopify: base64(HMAC_SHA256(secret, rawBody))
 */
export function verifyWebhookHmac(params: {
  rawBody: string;
  hmacHeader: string;
  clientSecret: string;
}): boolean {
  const provided = String(params.hmacHeader || "").trim();
  if (!provided) return false;

  const computed = crypto
    .createHmac("sha256", params.clientSecret)
    .update(params.rawBody, "utf8")
    .digest("base64");

  return timingSafeEqualBase64(computed, provided);
}

function timingSafeEqualBase64(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a, "base64");
    const bb = Buffer.from(b, "base64");
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}
