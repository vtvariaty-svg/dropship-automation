// apps/api/src/integrations/shopify/oauth.ts
// Shopify OAuth + HMAC helpers.
// Mantém compat com código antigo e novo (scope/scopes, access_token/accessToken, requestedScopes/scopes).

import crypto from "node:crypto";
import { env } from "../../env";

export type ExchangeTokenResult = {
  shop: string;

  // compat antigo (snake_case)
  access_token: string;
  scope: string | null;

  // compat novo (camelCase)
  accessToken: string;
  scopes: string | null;
};

export function normalizeShop(input: string): string {
  const s = (input || "").trim().toLowerCase();
  if (!s) return s;

  // aceita "cliquebuy-dev-3" e converte para *.myshopify.com
  if (!s.includes(".")) return `${s}.myshopify.com`;

  // remove protocolo caso venha
  return s.replace(/^https?:\/\//, "");
}

export function randomState(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("hex");
}

function timingSafeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

/**
 * Verifica o HMAC padrão do OAuth (querystring).
 * Shopify envia hmac na query. Você deve assinar todos os params exceto hmac/signature.
 */
export function verifyHmac(query: Record<string, any>, secret: string): boolean {
  const hmac = String(query.hmac || "");
  if (!hmac) return false;

  const message = Object.keys(query)
    .filter((k) => k !== "hmac" && k !== "signature")
    .sort()
    .map((k) => `${k}=${Array.isArray(query[k]) ? query[k].join(",") : String(query[k])}`)
    .join("&");

  const digest = crypto.createHmac("sha256", secret).update(message).digest("hex");
  return timingSafeEqual(digest, hmac);
}

/**
 * Verifica HMAC do webhook.
 * Header padrão Shopify: X-Shopify-Hmac-Sha256 (base64)
 */
export function verifyWebhookHmac(rawBody: string, hmacHeader: string, secret: string): boolean {
  if (!rawBody) return false;
  if (!hmacHeader) return false;

  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  return timingSafeEqual(digest, hmacHeader);
}

// ---- Compat aliases (se seu código importar verifyWebhookHmac por outro nome) ----
export function verifyWebhookHmacLegacy(rawBody: string, hmacHeader: string, secret: string): boolean {
  return verifyWebhookHmac(rawBody, hmacHeader, secret);
}

// Endpoint GraphQL admin
export function adminGraphQLEndpoint(shop: string): string {
  const s = normalizeShop(shop);
  const version = env.SHOPIFY_API_VERSION || "2024-07";
  return `https://${s}/admin/api/${version}/graphql.json`;
}

/**
 * Monta a URL de instalação (OAuth start).
 * compat: aceita `scopes` ou `requestedScopes`.
 */
export function buildInstallUrl(args: {
  shop: string;
  state: string;
  redirectUri: string;
  scopes?: string;
  requestedScopes?: string;
}): string {
  const shop = normalizeShop(args.shop);
  const clientId = env.SHOPIFY_CLIENT_ID;
  if (!clientId) throw new Error("Missing SHOPIFY_CLIENT_ID");

  const scopes = (args.scopes ?? args.requestedScopes ?? env.SHOPIFY_SCOPES ?? "").trim();
  if (!scopes) throw new Error("Missing SHOPIFY_SCOPES (or scopes/requestedScopes)");

  const u = new URL(`https://${shop}/admin/oauth/authorize`);
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("scope", scopes);
  u.searchParams.set("redirect_uri", args.redirectUri);
  u.searchParams.set("state", args.state);
  // (opcional) u.searchParams.set("grant_options[]", "per-user");
  return u.toString();
}

export async function exchangeCodeForToken(args: {
  shop: string;
  code: string;
  redirectUri: string;
}): Promise<ExchangeTokenResult> {
  const shop = normalizeShop(args.shop);

  const clientId = env.SHOPIFY_CLIENT_ID;
  const clientSecret = env.SHOPIFY_CLIENT_SECRET;
  if (!clientId) throw new Error("Missing SHOPIFY_CLIENT_ID");
  if (!clientSecret) throw new Error("Missing SHOPIFY_CLIENT_SECRET");

  const tokenUrl = `https://${shop}/admin/oauth/access_token`;

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: args.code,
      redirect_uri: args.redirectUri,
    }),
  });

  const json = (await res.json()) as any;

  if (!res.ok) {
    throw new Error(`Shopify token exchange failed: ${res.status} ${JSON.stringify(json)}`);
  }

  const accessToken = String(json.access_token || "");
  const scope = json.scope ? String(json.scope) : null;

  if (!accessToken) throw new Error(`Shopify token missing access_token: ${JSON.stringify(json)}`);

  // Retorna em ambos formatos (compat)
  return {
    shop,
    access_token: accessToken,
    scope,
    accessToken,
    scopes: scope,
  };
}

/**
 * Valida state de forma simples. Se quiser armazenar state em DB/Redis, faça aqui.
 */
export function isValidState(expected: string, received: string): boolean {
  return Boolean(expected && received && expected === received);
}

// Mantém export com nomes que seu código pode estar tentando importar
export const verifyHmacLegacy = verifyHmac;
export const verifyWebhookHmac = verifyWebhookHmac;
