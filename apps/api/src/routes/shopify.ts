// apps/api/src/routes/shopify.ts
import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { buildInstallUrl, normalizeShop, randomState, verifyHmac, validateShopParam } from "../integrations/shopify/oauth";
import { exchangeCodeForToken } from "../integrations/shopify/token";
import { upsertShopifyConnection } from "../integrations/shopify/store";

export async function shopifyRoutes(app: FastifyInstance) {
  // Health simples
  app.get("/shopify", async () => ({ ok: true, route: "/shopify" }));

  // ✅ Compat: seu teste manual foi /shopify/install?shop=...
  app.get("/shopify/install", async (req, reply) => {
    const q = req.query as any;
    const shop = normalizeShop(q.shop);
    validateShopParam(shop);

    const state = randomState();
    // Se quiser: salvar state em cookie/sessão. Por enquanto, simples:
    reply.setCookie("shopify_state", state, { path: "/", httpOnly: true, sameSite: "lax", secure: env.NODE_ENV === "production" });

    const url = buildInstallUrl(shop, state);
    return reply.redirect(url);
  });

  // Mantém também /shopify/auth
  app.get("/shopify/auth", async (req, reply) => {
    const q = req.query as any;
    const shop = normalizeShop(q.shop);
    validateShopParam(shop);

    const state = randomState();
    reply.setCookie("shopify_state", state, { path: "/", httpOnly: true, sameSite: "lax", secure: env.NODE_ENV === "production" });

    const url = buildInstallUrl(shop, state);
    return reply.redirect(url);
  });

  // Callback do OAuth
  app.get("/shopify/callback", async (req, reply) => {
    const q = req.query as any;

    // 1) valida shop
    const shop = normalizeShop(q.shop);
    validateShopParam(shop);

    // 2) valida state (cookie)
    const stateCookie = (req.cookies as any)?.shopify_state;
    if (!stateCookie || String(stateCookie) !== String(q.state)) {
      return reply.code(401).send({ ok: false, error: "Invalid state" });
    }

    // 3) valida hmac
    const okHmac = verifyHmac(q, env.SHOPIFY_CLIENT_SECRET);
    if (!okHmac) {
      return reply.code(401).send({ ok: false, error: "Invalid HMAC" });
    }

    // 4) troca code por token
    const code = String(q.code || "");
    if (!code) return reply.code(400).send({ ok: false, error: "Missing code" });

    const token = await exchangeCodeForToken(shop, code);

    // 5) salva conexão no DB
    await upsertShopifyConnection({
      shop,
      accessToken: token.access_token,
      scope: token.scope,
    });

    // 6) redireciona para uma página sua (por enquanto manda JSON ou home)
    // Se você tiver um frontend embed, a URL normalmente inclui shop e host.
    return reply.send({ ok: true, shop, installed: true });
  });
}
