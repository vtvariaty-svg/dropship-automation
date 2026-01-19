// apps/api/src/integrations/shopify/oauth.ts
import crypto from "crypto";
import fetch from "node-fetch";
import { saveShopToken } from "./store";

export function normalizeShop(shop: string): string {
  return shop.trim().toLowerCase();
}

export function randomState(len = 16): string {
  return crypto.randomBytes(len).toString("hex");
}

export function buildInstallUrl(args: {
  shop: string;
  clientId: string;
  scopes: string;
  redirectUri: string;
  state: string;
}): string {
  const shop = normalizeShop(args.shop);
  const params = new URLSearchParams({
    client_id: args.clientId,
    scope: args.scopes,
    redirect_uri: args.redirectUri,
    state: args.state,
  });

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

export function verifyHmac(args: { query: Record<string, any>; clientSecret: string }): boolean {
  const query = { ...args.query };
  const sentHmac = String(query.hmac || "");
  delete query.hmac;
  delete query.signature;

  const message = Object.keys(query)
    .sort()
    .map((k) => `${k}=${Array.isArray(query[k]) ? query[k].join(",") : query[k]}`)
    .join("&");

  const computed = crypto.createHmac("sha256", args.clientSecret).update(message).digest("hex");
  return safeCompare(computed, sentHmac);
}

export function verifyWebhookHmac(args: {
  rawBody: string;
  hmacHeader: string | undefined;
  clientSecret: string;
}): boolean {
  const hmacHeader = args.hmacHeader || "";
  if (!hmacHeader) return false;
  const computed = crypto.createHmac("sha256", args.clientSecret).update(args.rawBody, "utf8").digest("base64");
  return safeCompare(computed, hmacHeader);
}

function safeCompare(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

export async function exchangeCodeForToken(args: {
  shop: string;
  code: string;
  clientId?: string;
  clientSecret?: string;
  // Fallback used only if Shopify response omits scopes for any reason.
  requestedScopes?: string;
}): Promise<{ access_token: string; scopes: string }> {
  const shop = normalizeShop(args.shop);
  const client_id = args.clientId || process.env.SHOPIFY_CLIENT_ID;
  const client_secret = args.clientSecret || process.env.SHOPIFY_CLIENT_SECRET;

  if (!client_id || !client_secret) throw new Error("Missing SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET");

  const url = `https://${shop}/admin/oauth/access_token`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id,
      client_secret,
      code: args.code,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Token exchange failed (${resp.status}): ${txt}`);
  }

  const data = (await resp.json()) as any;
  const access_token = String(data.access_token || "");
  const scopes = String(data.scope || data.scopes || args.requestedScopes || "").trim();

  if (!access_token) throw new Error("Token exchange: missing access_token");
  if (!scopes) throw new Error("Token exchange: missing scopes (SHOPIFY_SCOPES must be set)");

  return { access_token, scopes };
}

// Optional convenience: install + persist in one call (not used everywhere yet)
export async function finalizeInstall(args: {
  shop: string;
  code: string;
  requestedScopes?: string;
}): Promise<{ shop: string }> {
  const token = await exchangeCodeForToken({
    shop: args.shop,
    code: args.code,
    requestedScopes: args.requestedScopes || process.env.SHOPIFY_SCOPES,
  });

  await saveShopToken({ shop: normalizeShop(args.shop), accessToken: token.access_token, scopes: token.scopes });

  return { shop: normalizeShop(args.shop) };
}
