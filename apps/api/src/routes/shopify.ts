// apps/api/src/routes/shopify.ts

import { FastifyInstance } from "fastify";
import {
  buildInstallUrl,
  exchangeCodeForToken,
  normalizeShop,
  randomState,
  verifyHmac,
} from "../integrations/shopify/oauth";
import { env } from "../env";
import { saveShopToken } from "../integrations/shopify/store";

export async function shopifyRoutes(app: FastifyInstance) {
  // Início OAuth
  app.get("/shopify/install", async (req, reply) => {
    const shop = normalizeShop(String((req.query as any).shop || ""));
    if (!shop) return reply.code(400).send({ error: "missing shop" });

    const state = randomState();

    const redirectUri = `${env.BASE_URL}/shopify/callback`;

    const installUrl = buildInstallUrl({
      shop,
      state,
      redirectUri,
      // compat: pode vir de env
      scopes: env.SHOPIFY_SCOPES,
    });

    // Em produção, você deve salvar o state (cookie/redis). Aqui simples:
    reply.setCookie("shopify_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60, // 10 min
    });

    return reply.redirect(installUrl);
  });

  // Callback OAuth
  app.get("/shopify/callback", async (req, reply) => {
    const q = req.query as any;

    const shop = normalizeShop(String(q.shop || ""));
    const code = String(q.code || "");
    const hmac = String(q.hmac || "");
    const state = String(q.state || "");
    const savedState = String((req.cookies as any)?.shopify_oauth_state || "");

    if (!shop || !code || !hmac) {
      return reply.code(400).send({ error: "missing shop/code/hmac" });
    }

    // Verifica HMAC (Shopify)
    if (!verifyHmac(q, env.SHOPIFY_CLIENT_SECRET)) {
      return reply.code(401).send({ error: "invalid hmac" });
    }

    if (!savedState || state !== savedState) {
      return reply.code(401).send({ error: "invalid state" });
    }

    const redirectUri = `${env.BASE_URL}/shopify/callback`;

    const token = await exchangeCodeForToken({
      shop,
      code,
      redirectUri,
    });

    // compat: usa accessToken e scopes
    await saveShopToken({
      shop,
      accessToken: token.accessToken,
      scopes: token.scopes,
      scope: token.scope,
    });

    // Você pode redirecionar para app embed (admin) depois.
    return reply.send({
      ok: true,
      shop,
      saved: true,
      scopes: token.scopes ?? token.scope,
    });
  });
}
