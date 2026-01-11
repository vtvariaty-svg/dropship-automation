import crypto from "node:crypto";
import { env } from "../../env";

/**
 * Normaliza e valida o domínio da loja.
 * Aceita:
 * - cliquebuydev.myshopify.com
 * - https://cliquebuydev.myshopify.com
 * - cliquebuydev (vira cliquebuydev.myshopify.com)
 */
export function normalizeShop(input: string): string {
  if (!input) throw new Error("Missing shop");

  let shop = input.trim();

  // remove protocolo
  shop = shop.replace(/^https?:\/\//i, "");

  // remove path/query
  shop = shop.split("/")[0].split("?")[0];

  // se veio só o subdomínio, completa
  if (!shop.includes(".")) shop = `${shop}.myshopify.com`;

  // valida padrão Shopify (bem estrito)
  const ok = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);
  if (!ok) throw new Error(`Invalid shop domain: ${shop}`);

  return shop.toLowerCase();
}

export function randomState(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Valida o HMAC do callback do Shopify.
 * Regras:
 * - Remover "hmac" e "signature" do cálculo
 * - Ordenar por chave
 * - Construir querystring key=value&...
 * - Comparar com timingSafeEqual
 */
export function validateHmac(query: Record<string, any>, clientSecret = env.SHOPIFY_CLIENT_SECRET): boolean {
  const provided = String(query?.hmac ?? "");
  if (!provided) return false;

  // copia e remove campos que não entram no cálculo
  const entries: [string, string][] = Object.entries(query)
    .filter(([k]) => k !== "hmac" && k !== "signature")
    .map(([k, v]) => [k, Array.isArray(v) ? String(v[0]) : String(v)]);

  // ordena por chave
  entries.sort(([a], [b]) => a.localeCompare(b));

  // monta message
  const message = entries.map(([k, v]) => `${k}=${v}`).join("&");

  const digest = crypto.createHmac("sha256", clientSecret).update(message).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(digest, "utf8"), Buffer.from(provided, "utf8"));
  } catch {
    return false;
  }
}

/**
 * Monta URL de autorização do Shopify.
 */
export function buildAuthorizeUrl(params: {
  shop: string;
  state: string;
  scopes?: string;
  redirectUri?: string;
}): string {
  const shop = normalizeShop(params.shop);

  const scopes = (params.scopes ?? env.SHOPIFY_SCOPES ?? "").trim();
  if (!scopes) throw new Error("Missing SHOPIFY_SCOPES");

  const redirectUri = (params.redirectUri ?? env.SHOPIFY_REDIRECT_URI ?? "").trim();
  if (!redirectUri) throw new Error("Missing SHOPIFY_REDIRECT_URI / BASE_URL");

  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", env.SHOPIFY_CLIENT_ID);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", params.state);

  // (opcional) offline access por padrão; se quiser online, adicione grant_options[]=per-user
  // url.searchParams.append("grant_options[]", "per-user");

  return url.toString();
}

/**
 * Troca code por access_token (Shopify).
 */
export async function exchangeCodeForToken(params: {
  shop: string;
  code: string;
}): Promise<{ access_token: string; scope: string }> {
  const shop = normalizeShop(params.shop);

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: env.SHOPIFY_CLIENT_ID,
      client_secret: env.SHOPIFY_CLIENT_SECRET,
      code: params.code,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string; scope: string };
  if (!data?.access_token) throw new Error("Token exchange response missing access_token");
  return data;
}
