// apps/api/src/routes/shopify.ts
import type { FastifyPluginAsync } from "fastify";
import { buildInstallUrl, exchangeCodeForToken, normalizeShop, randomState, verifyHmac } from "../integrations/shopify/oauth";
import { saveShopToken } from "../integrations/shopify/store";

export const shopifyRoutes: FastifyPluginAsync = async (app) => {
  app.get("/shopify/install", async (request, reply) => {
    const shop = normalizeShop(String((request.query as any).shop || ""));
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const scopes = String(process.env.SHOPIFY_SCOPES || "").trim();
    const appUrl = String(process.env.APP_URL || "").trim();

    if (!shop) return reply.code(400).send({ ok: false, error: "Missing shop" });
    if (!clientId) return reply.code(500).send({ ok: false, error: "Missing SHOPIFY_CLIENT_ID" });
    if (!scopes) return reply.code(500).send({ ok: false, error: "Missing SHOPIFY_SCOPES" });
    if (!appUrl) return reply.code(500).send({ ok: false, error: "Missing APP_URL" });

    const state = randomState(16);
    const redirectUri = `${appUrl}/shopify/callback`;

    const url = buildInstallUrl({
      shop,
      clientId,
      scopes,
      redirectUri,
      state,
    });

    return reply.redirect(url);
  });

  app.get("/shopify/callback", async (request, reply) => {
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return reply.code(500).send({ ok: false, error: "Missing SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET" });
    }

    const query = request.query as any;
    const shop = normalizeShop(String(query.shop || ""));
    const code = String(query.code || "");
    const requestedScopes = String(process.env.SHOPIFY_SCOPES || "").trim();

    if (!code) return reply.code(400).send({ ok: false, error: "Missing code" });

    const ok = verifyHmac({ query, clientSecret });
    if (!ok) return reply.code(401).send({ ok: false, error: "Invalid OAuth HMAC" });

    const token = await exchangeCodeForToken({
      shop,
      clientId,
      clientSecret,
      code,
      requestedScopes,
    });

    await saveShopToken({
      shop,
      accessToken: token.access_token,
      scopes: token.scopes,
    });

    return reply.send({ ok: true, shop });
  });
};
