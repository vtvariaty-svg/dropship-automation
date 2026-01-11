// apps/api/src/integrations/shopify/oauth.ts
import crypto from "crypto";
import { env } from "../../env";

/**
 * Normaliza e valida o domínio da loja (shop param).
 * Aceita apenas *.myshopify.com
 */
export function normalizeShop(input: unknown): string {
  const shop = String(input ?? "").trim().toLowerCase();

  // Shopify recomenda validar o "shop" estritamente
  // Ex: "cliquebuydev.myshopify.com"
  const ok = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop);
  if (!ok) {
    throw new Error(`Invalid shop domain: ${shop}`);
  }
  return shop;
}

/**
 * Endpoint GraphQL Admin da Shopify
 */
export function adminGraphQLEndpoint(shop: string): string {
  const s = normalizeShop(shop);
  return `https://${s}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
}

/**
 * Endpoint REST Admin da Shopify (se precisar)
 */
export function adminRestBase(shop: string): string {
  const s = normalizeShop(shop);
  return `https://${s}/admin/api/${env.SHOPIFY_API_VERSION}`;
}

/**
 * Nonce/state para OAuth
 */
export function createNonce(size = 16): string {
  return crypto.randomBytes(size).toString("hex");
}

/**
 * Monta a URL de autorização para instalar o app
 */
export function buildAuthorizeUrl(params: {
  shop: string;
  state: string;
  redirectUri?: string;
  scopes?: string;
}): string {
  const shop = normalizeShop(params.shop);

  const redirectUri = params.redirectUri ?? env.SHOPIFY_REDIRECT_URI;
  const scopes = params.scopes ?? env.SHOPIFY_SCOPES;

  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", env.SHOPIFY_CLIENT_ID);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", params.state);

  // opcional, mas ajuda (evita popups)
  url.searchParams.set("grant_options[]", "per-user");

  return url.toString();
}

/**
 * Valida HMAC (querystring) conforme Shopify.
 * Use isso no callback (/shopify/callback) antes de trocar code por token.
 */
export function validateHmac(query: Record<string, any>): boolean {
  // Shopify manda "hmac" na query
  const hmac = String(query?.hmac ?? "");
  if (!hmac) return false;

  // Copia params e remove hmac/signature
  const entries: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(query ?? {})) {
    if (k === "hmac" || k === "signature") continue;
    if (v === undefined || v === null) continue;

    // Fastify pode trazer array dependendo do parser
    if (Array.isArray(v)) {
      for (const item of v) entries.push([k, String(item)]);
    } else {
      entries.push([k, String(v)]);
    }
  }

  // Ordena por chave (ordem lexicográfica)
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  // IMPORTANTE:
  // Shopify quer "k=v" unidos por "&" com valores já no padrão query (URL encoded)
  // mas o algoritmo usa a forma "query string" gerada por URLSearchParams (que já escapa).
  const message = new URLSearchParams(entries).toString();

  const digest = crypto
    .createHmac("sha256", env.SHOPIFY_CLIENT_SECRET)
    .update(message, "utf8")
    .digest("hex");

  return timingSafeEqualHex(digest, hmac);
}

function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  try {
    const a = Buffer.from(aHex, "hex");
    const b = Buffer.from(bHex, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Troca code -> access_token
 */
export async function exchangeCodeForToken(params: {
  shop: string;
  code: string;
}): Promise<string> {
  const shop = normalizeShop(params.shop);

  const url = `https://${shop}/admin/oauth/access_token`;
  const res = await fetch(url, {
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
    throw new Error(
      `Failed to exchange code for token (HTTP ${res.status}): ${text}`
    );
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("No access_token returned by Shopify");
  }

  return data.access_token;
}
