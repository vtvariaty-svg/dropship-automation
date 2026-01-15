import { FastifyPluginAsync } from "fastify";
import { buildInstallUrl, exchangeCodeForToken, normalizeShop, randomState, verifyHmac } from "../integrations/shopify/oauth";

// Ajuste para o teu store real:
import { saveShopToken } from "../integrations/shopify/store";

export const shopifyRoutes: FastifyPluginAsync = async (app) => {
  app.get("/shopify/install", async (request, reply) => {
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const scopes = process.env.SHOPIFY_SCOPES;
    const appUrl = process.env.APP_URL;

    if (!clientId || !scopes || !appUrl) {
      return reply.code(500).send({ ok: false, error: "Missing SHOPIFY_CLIENT_ID / SHOPIFY_SCOPES / APP_URL" });
    }

    const shopParam = String((request.query as any)?.shop || "");
    const shop = normalizeShop(shopParam);

    const state = randomState(16);
    // Se você tiver sessão/cookie, salve o state pra validar depois.
    // Aqui mantive simples.

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

    if (!code) return reply.code(400).send({ ok: false, error: "Missing code" });

    const ok = verifyHmac({ query, clientSecret });
    if (!ok) return reply.code(401).send({ ok: false, error: "Invalid OAuth HMAC" });

    const token = await exchangeCodeForToken({
      shop,
      clientId,
      clientSecret,
      code,
    });

    await saveShopToken({
      shop,
      accessToken: token.access_token,
      scope: token.scope,
    });

    return reply.send({ ok: true, shop });
  });
};
