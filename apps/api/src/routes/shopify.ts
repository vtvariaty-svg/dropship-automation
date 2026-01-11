import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { buildInstallUrl, randomState, verifyHmac } from "../integrations/shopify/oauth";

/**
 * Shopify OAuth routes
 *
 * Endpoints:
 *  - GET /shopify/install?shop=xxxx.myshopify.com
 *  - GET /shopify/callback?shop=...&code=...&state=...&hmac=...&timestamp=...
 *
 * This file assumes @fastify/cookie is registered in src/index.ts.
 */

function normalizeShop(input: unknown): string {
  const shop = String(input ?? "").trim().toLowerCase();

  // Shopify shop domains look like: something.myshopify.com
  if (!shop || !shop.endsWith(".myshopify.com")) return "";

  // only allow a-z0-9 and hyphen in the subdomain
  const sub = shop.replace(".myshopify.com", "");
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(sub)) return "";

  return `${sub}.myshopify.com`;
}

async function exchangeCodeForToken(params: {
  shop: string;
  code: string;
}): Promise<{ access_token: string; scope?: string }> {
  const { shop, code } = params;

  const url = `https://${shop}/admin/oauth/access_token`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: env.SHOPIFY_CLIENT_ID,
      client_secret: env.SHOPIFY_CLIENT_SECRET,
      code,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Shopify token exchange failed (${res.status}): ${text}`);
  }

  return (await res.json()) as { access_token: string; scope?: string };
}

export async function shopifyRoutes(app: FastifyInstance) {
  /**
   * Start OAuth install
   * Example:
   *   GET /shopify/install?shop=cliquebuydev.myshopify.com
   */
  app.get("/shopify/install", async (request, reply) => {
    const q = request.query as Record<string, unknown>;
    const shop = normalizeShop(q.shop);

    if (!shop) {
      return reply.code(400).send({
        ok: false,
        error: "Missing or invalid `shop` (expected something.myshopify.com).",
        example: "/shopify/install?shop=your-store.myshopify.com",
      });
    }

    const state = randomState(24);

    // store state in httpOnly cookie (10 min)
    reply.setCookie("shopify_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });

    const installUrl = buildInstallUrl(shop, {
      clientId: env.SHOPIFY_CLIENT_ID,
      scopes: env.SHOPIFY_SCOPES,
      redirectUri: env.SHOPIFY_REDIRECT_URI,
      state,
    });

    return reply.redirect(installUrl);
  });

  /**
   * OAuth callback
   */
  app.get("/shopify/callback", async (request, reply) => {
    const q = request.query as Record<string, unknown>;

    const shop = normalizeShop(q.shop);
    const code = String(q.code ?? "");
    const state = String(q.state ?? "");

    if (!shop || !code || !state) {
      return reply.code(400).send({
        ok: false,
        error: "Missing required params (shop, code, state).",
        received: { shop: q.shop, code: Boolean(q.code), state: Boolean(q.state) },
      });
    }

    // 1) Validate state (CSRF)
    const cookieState = request.cookies?.shopify_oauth_state;
    if (!cookieState || cookieState !== state) {
      return reply.code(401).send({ ok: false, error: "Invalid OAuth state." });
    }

    // clear cookie (one-time use)
    reply.setCookie("shopify_oauth_state", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    // 2) Validate HMAC signature from Shopify
    const hmacOk = verifyHmac(q, env.SHOPIFY_CLIENT_SECRET);
    if (!hmacOk) {
      return reply.code(401).send({ ok: false, error: "Invalid HMAC." });
    }

    // 3) Exchange code for access token
    const tokenData = await exchangeCodeForToken({ shop, code });

    // 4) Persist connection (best effort)
    try {
      const mod = await import("../integrations/shopify/store");
      const upsert = (mod as any).upsertShopifyConnection as
        | ((input: any) => Promise<any>)
        | undefined;

      if (upsert) {
        await upsert({
          shop,
          accessToken: tokenData.access_token,
          scope: tokenData.scope ?? env.SHOPIFY_SCOPES,
          installedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      request.log.warn({ err: e }, "Could not persist Shopify connection (continuing).");
    }

    // 5) Done
    return reply.send({
      ok: true,
      shop,
      scope: tokenData.scope ?? env.SHOPIFY_SCOPES,
      message: "Shopify installed. Token stored (if persistence is configured).",
      next: "Proceed to Shop Context Loader.",
    });
  });
}
