// apps/api/src/routes/shopify.ts
import { FastifyPluginAsync } from "fastify";
import { ShopifyAdapter } from "../platforms/shopify/shopifyAdapter";
import { saveShopToken } from "../integrations/shopify/store";

export const shopifyRoutes: FastifyPluginAsync = async (app) => {
  const adapter = new ShopifyAdapter();

  app.get("/shopify/install", async (request, reply) => {
    const clientId = process.env.SHOPIFY_CLIENT_ID || "";
    const scopes = process.env.SHOPIFY_SCOPES || "";
    const appUrl = process.env.APP_URL || "";

    if (!clientId || !scopes || !appUrl) {
      return reply.code(500).send({ ok: false, error: "Missing SHOPIFY_CLIENT_ID / SHOPIFY_SCOPES / APP_URL" });
    }

    const shopParam = String((request.query as any)?.shop || "");
    const shop = adapter.normalizeTenant(shopParam);

    const state = "state_" + Date.now(); // simples (pode evoluir depois)
    const redirectUri = `${appUrl}/shopify/callback`;

    const url = adapter.buildInstallUrl({
      shop,
      clientId,
      scopes,
      redirectUri,
      state,
    });

    return reply.redirect(url);
  });

  app.get("/shopify/callback", async (request, reply) => {
    const clientId = process.env.SHOPIFY_CLIENT_ID || "";
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || "";
    const appUrl = process.env.APP_URL || "";

    if (!clientId || !clientSecret || !appUrl) {
      return reply.code(500).send({ ok: false, error: "Missing SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET / APP_URL" });
    }

    const query = request.query as any;
    const shop = adapter.normalizeTenant(String(query.shop || ""));
    const code = String(query.code || "");

    if (!shop) return reply.code(400).send({ ok: false, error: "Missing shop" });
    if (!code) return reply.code(400).send({ ok: false, error: "Missing code" });

    const ok = adapter.verifyHmac({ query, secret: clientSecret });
    if (!ok) return reply.code(401).send({ ok: false, error: "Invalid OAuth HMAC" });

    const token = await adapter.exchangeCodeForToken({
      shop,
      clientId,
      clientSecret,
      code,
    });

    await saveShopToken({
      shop,
      accessToken: token.accessToken,
      scopes: token.scopes,
    });

    // opcional: registrar webhooks automaticamente após install
    const webhookUrlBase = process.env.WEBHOOK_URL_BASE || appUrl;
    await adapter.ensureWebhooks({
      shop,
      accessToken: token.accessToken,
      webhookUrlBase,
    });

    return reply.send({ ok: true, shop });
  });
};
