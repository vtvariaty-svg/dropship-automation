import crypto from "node:crypto";

/**
 * Valida domínio da shop (ex: xxx.myshopify.com)
 */
export function isValidShop(shop: string): boolean {
  if (!shop) return false;
  const s = shop.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s);
}

/**
 * Gera state aleatório para OAuth
 */
export function randomState(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Constrói URL de instalação do app (OAuth start)
 */
export function buildInstallUrl(params: {
  shop: string;
  clientId: string;
  redirectUri: string;
  scopes: string;
  state: string;
}): string {
  const { shop, clientId, redirectUri, scopes, state } = params;

  if (!isValidShop(shop)) throw new Error("Invalid shop domain");

  const q = new URLSearchParams({
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state,
  });

  return `https://${shop}/admin/oauth/authorize?${q.toString()}`;
}

/**
 * Verifica HMAC do callback do OAuth (querystring).
 * Shopify: remove "hmac" e "signature", ordena e monta query
 */
export function verifyHmac(params: {
  query: Record<string, unknown>;
  secret: string;
}): boolean {
  const { query, secret } = params;
  const q: Record<string, string> = {};

  for (const [k, v] of Object.entries(query)) {
    if (k === "hmac" || k === "signature") continue;
    if (v === undefined || v === null) continue;

    // Fastify pode entregar string | string[]
    if (Array.isArray(v)) q[k] = v.join(",");
    else q[k] = String(v);
  }

  const message = Object.keys(q)
    .sort()
    .map((k) => `${k}=${q[k]}`)
    .join("&");

  const provided = String((query as any).hmac || "").trim();
  if (!provided) return false;

  const digest = crypto
    .createHmac("sha256", secret)
    .update(message, "utf8")
    .digest("hex");

  return timingSafeEqual(digest, provided);
}

/**
 * Troca code -> access_token
 */
export async function exchangeCodeForToken(params: {
  shop: string;
  clientId: string;
  clientSecret: string;
  code: string;
}): Promise<{ accessToken: string; scope: string }> {
  const { shop, clientId, clientSecret, code } = params;

  if (!isValidShop(shop)) throw new Error("Invalid shop domain");

  const url = `https://${shop}/admin/oauth/access_token`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OAuth token exchange failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as any;

  if (!data?.access_token) {
    throw new Error("OAuth token exchange returned no access_token");
  }

  return {
    accessToken: String(data.access_token),
    scope: String(data.scope || ""),
  };
}

/**
 * Endpoint Admin GraphQL para uma shop (para client.ts usar)
 * Shopify GraphQL Admin endpoint:
 * https://{shop}/admin/api/{version}/graphql.json
 */
export function adminGraphQLEndpoint(shop: string, apiVersion = "2024-10"): string {
  if (!isValidShop(shop)) throw new Error("Invalid shop domain");
  return `https://${shop}/admin/api/${apiVersion}/graphql.json`;
}

/**
 * Verifica HMAC de webhook (base64 SHA256) usando o RAW BODY
 * header: X-Shopify-Hmac-Sha256
 */
export function verifyWebhookHmac(params: {
  rawBody: string;
  hmacHeader: string | undefined;
  secret: string;
}): boolean {
  const { rawBody, hmacHeader, secret } = params;

  const provided = (hmacHeader || "").trim();
  if (!provided) return false;

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  return timingSafeEqual(digest, provided);
}

/**
 * timing-safe compare pra evitar leak
 */
function timingSafeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}
