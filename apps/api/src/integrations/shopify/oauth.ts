// apps/api/src/integrations/shopify/oauth.ts
import crypto from "node:crypto";
import { env } from "../../env";
import { ShopifyAdminClient } from "./adminClient";
import { saveShopToken } from "./store";
import { ensureCoreWebhooks } from "./webhookRegistrar";

export const SHOPIFY_STATE_COOKIE = "shopify_state";
export const DEFAULT_API_VERSION = env.SHOPIFY_API_VERSION ?? "2024-10";

export function normalizeShop(input: string): string {
  const s = (input ?? "").trim().toLowerCase();
  const noProto = s.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return noProto;
}

export function randomState(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function verifyHmac(args: {
  query: Record<string, any>;
  clientSecret: string;
}): boolean {
  const q = { ...args.query };
  const hmac = String(q.hmac ?? "");
  delete q.hmac;
  delete q.signature;

  const message = Object.keys(q)
    .sort()
    .map((k) => `${k}=${Array.isArray(q[k]) ? q[k].join(",") : String(q[k])}`)
    .join("&");

  const digest = crypto
    .createHmac("sha256", args.clientSecret)
    .update(message)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest, "utf8"),
      Buffer.from(hmac, "utf8")
    );
  } catch {
    return false;
  }
}

export function verifyWebhookHmac(args: {
  rawBody: string;
  hmacHeader: string;
  secret: string;
}): boolean {
  const computed = crypto
    .createHmac("sha256", args.secret)
    .update(args.rawBody, "utf8")
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, "utf8"),
      Buffer.from(String(args.hmacHeader ?? ""), "utf8")
    );
  } catch {
    return false;
  }
}

export async function exchangeCodeForToken(args: {
  shop: string;
  code: string;
  clientId?: string;
  clientSecret?: string;
}): Promise<{ access_token: string; scopes: string | null }> {
  const shop = normalizeShop(args.shop);
  const clientId = args.clientId ?? env.SHOPIFY_CLIENT_ID;
  const clientSecret = args.clientSecret ?? env.SHOPIFY_CLIENT_SECRET;

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: args.code,
    }),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(
      `Shopify token exchange failed (${res.status}): ${JSON.stringify(data)}`
    );
  }

  return {
    access_token: String(data.access_token),
    scopes: data?.scope ? String(data.scope) : null,
  };
}

/**
 * FINAL do install:
 * - salva token
 * - registra webhooks (APP_UNINSTALLED)
 * - logs determinísticos no Render
 */
export async function finalizeInstall(args: {
  shop: string;
  accessToken: string;
  scopes?: string | null;
}): Promise<void> {
  const shop = normalizeShop(args.shop);

  // ✅ BASE_URL precisa ser público e https
  const baseUrl = (env.BASE_URL ?? "").replace(/\/+$/, "");
  if (!baseUrl || !baseUrl.startsWith("https://")) {
    throw new Error(
      `Invalid BASE_URL: "${env.BASE_URL}". It must be public https URL (e.g. https://your-service.onrender.com)`
    );
  }

  console.log(
    JSON.stringify({
      msg: "finalizeInstall.start",
      shop,
      baseUrl,
    })
  );

  await saveShopToken({
    shop,
    accessToken: args.accessToken,
    scopes: args.scopes ?? null,
  });

  console.log(
    JSON.stringify({
      msg: "finalizeInstall.tokenSaved",
      shop,
    })
  );

  const client = new ShopifyAdminClient({
    shop,
    accessToken: args.accessToken,
  });

  console.log(
    JSON.stringify({
      msg: "finalizeInstall.ensureCoreWebhooks.start",
      shop,
      callbackUrl: `${baseUrl}/shopify/webhooks`,
    })
  );

  // 🔥 Se isso falhar, você VAI ver no Render Logs
  await ensureCoreWebhooks({ client, callbackBaseUrl: baseUrl });

  console.log(
    JSON.stringify({
      msg: "finalizeInstall.ensureCoreWebhooks.done",
      shop,
    })
  );
}
