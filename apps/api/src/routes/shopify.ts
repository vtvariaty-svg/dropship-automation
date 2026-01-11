// apps/api/src/routes/shopify.ts
import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";

import { env } from "../env";
import {
  buildInstallUrl,
  normalizeShop,
  validateHmac,
  exchangeCodeForToken,
} from "../integrations/shopify/oauth";
import { upsertShopConnection } from "../integrations/shopify/store";

type ShopifyAuthQuery = {
  shop?: string;
};

type ShopifyCallbackQuery = {
  shop?: string;
  code?: string;
  state?: string;
  hmac?: string;
  host?: string;
  timestamp?: string;
};

function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

function badRequest(reply: any, message: string) {
  return reply.code(400).send({ ok: false, error: message });
}

function getNormalizedShop(rawShop?: string): string | null {
  if (!rawShop) return null;
  const shop = normalizeShop(rawShop);
  return shop ?? null;
}

export async function shopifyRoutes(app: FastifyInstance) {
  /**
   * ✅ NEW: /shopify/install
   * Alias para /shopify/auth (muito comum em tutoriais).
   * Você pode usar:
   *   /shopify/install?shop=cliquebuydev.myshopify.com
   */
  app.get("/shopify/install", async (request, reply) => {
    const q = request.query as ShopifyAuthQuery;
    const shop = getNormalizedShop(q.shop);

    if (!shop) {
      return badRequest(
        reply,
        "Missing or invalid `shop`. Example: /shopify/install?shop=your-store.myshopify.com"
      );
    }

    // Reaproveita o mesmo fluxo do /shopify/auth
    return reply.redirect(`/shopify/auth?shop=${encodeURIComponent(shop)}`);
  });

  /**
   * /shopify/auth
   * Inicia o OAuth (redireciona para Shopify).
   */
  app.get("/shopify/auth", async (request, reply) => {
    const q = request.query as ShopifyAuthQuery;
    const shop = getNormalizedShop(q.shop);

    if (!shop) {
      return badRequest(
        reply,
        "Missing or invalid `shop`. Example: /shopify/auth?shop=your-store.myshopify.com"
      );
    }

    const state = generateState();

    // Cookie de estado para validar no callback
    reply.setCookie("shopify_oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10, // 10 min
    });

    const installUrl = buildInstallUrl(shop, {
      state,
      redirectUri: env.SHOPIFY_REDIRECT_URI,
    });

    return reply.redirect(installUrl);
  });

  /**
   * /shopify/callback
   * Shopify retorna aqui com code + hmac + state.
   */
  app.get("/shopify/callback", async (request, reply) => {
    const q = request.query as ShopifyCallbackQuery;

    const shop = getNormalizedShop(q.shop);
    if (!shop) return badRequest(reply, "Missing or invalid `shop`.");

    if (!q.code) return badRequest(reply, "Missing `code`.");
    if (!q.state) return badRequest(reply, "Missing `state`.");

    const stateCookie = (request.cookies as any)?.shopify_oauth_state;
    if (!stateCookie || stateCookie !== q.state) {
      return reply.code(401).send({ ok: false, error: "Invalid state" });
    }

    // Valida HMAC (segurança do callback)
    const ok = validateHmac(q as any, env.SHOPIFY_CLIENT_SECRET);
    if (!ok) {
      return reply.code(401).send({ ok: false, error: "Invalid HMAC" });
    }

    // Troca code por access_token
    const tok = await exchangeCodeForToken({
      shop,
      code: q.code,
      redirectUri: env.SHOPIFY_REDIRECT_URI,
    });

    const expiresAt =
      tok.expires_in && Number.isFinite(tok.expires_in)
        ? new Date(Date.now() + tok.expires_in * 1000)
        : null;

    // Salva conexão da loja (DB)
    await upsertShopConnection({
      shop,
      scope: tok.scope ?? env.SHOPIFY_SCOPES,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token ?? null,
      expiresAt,
    });

    // Limpa cookie state
    reply.setCookie("shopify_oauth_state", "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    /**
     * Aqui você pode:
     * 1) retornar JSON (dev)
     * 2) ou redirecionar pro seu frontend/admin
     *
     * Por enquanto mantive JSON, que é o que você já estava usando.
     */
    return reply.send({
      ok: true,
      shop,
      scope: tok.scope ?? env.SHOPIFY_SCOPES,
      message: "Shopify connected",
    });
  });
}
