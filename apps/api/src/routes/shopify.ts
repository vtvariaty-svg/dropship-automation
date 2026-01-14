import type { FastifyInstance } from "fastify";
import {
  SHOPIFY_STATE_COOKIE,
  buildInstallUrl,
  verifyHmac,
  exchangeCodeForToken,
  registerWebhooksForShop,
} from "../integrations/shopify/oauth";
import { saveShopToken } from "../integrations/shopify/store";

export async function shopifyRoutes(app: FastifyInstance) {
  /**
   * GET /shopify/install?shop=xxx.myshopify.com
   */
  app.get("/shopify/install", async (req, reply) => {
    const shop = String((req.query as any).shop ?? "").toLowerCase();

    if (!shop) {
      return reply.code(400).send({ ok: false, error: "Missing shop" });
    }

    const state = crypto.randomUUID();

    reply.setCookie(SHOPIFY_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    const installUrl = buildInstallUrl(shop, state);
    return reply.redirect(installUrl);
  });

  /**
   * GET /shopify/callback
   */
  app.get("/shopify/callback", async (req, reply) => {
    const query = req.query as Record<string, string>;
    const { shop, hmac, code, state } = query;

    if (!shop || !hmac || !code || !state) {
      return reply.code(400).send({ ok: false, error: "Missing parameters" });
    }

    const storedState = req.cookies[SHOPIFY_STATE_COOKIE];
    if (!storedState || storedState !== state) {
      return reply.code(400).send({ ok: false, error: "Invalid state" });
    }

    const valid = verifyHmac(query, hmac);
    if (!valid) {
      return reply.code(401).send({ ok: false, error: "Invalid HMAC" });
    }

    const accessToken = await exchangeCodeForToken(shop, code);

    // Persist token
    await saveShopToken({
      shop,
      accessToken,
    });

    // 🔥 REGISTRA WEBHOOKS (2 argumentos corretos)
    await registerWebhooksForShop(shop, accessToken);

    reply.clearCookie(SHOPIFY_STATE_COOKIE, { path: "/" });

    return reply.send({ ok: true, shop });
  });
}
