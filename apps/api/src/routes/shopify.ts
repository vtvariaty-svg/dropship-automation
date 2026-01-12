import type { FastifyInstance } from "fastify";
import {
  buildInstallUrl,
  generateState,
  assertValidCallback,
  exchangeCodeForToken,
  stateCookieName,
} from "../integrations/shopify/oauth";
import { saveShopToken } from "../integrations/shopify/store";

export async function shopifyRoutes(app: FastifyInstance) {
  app.get("/shopify/install", async (req, reply) => {
    const shop = (req.query as any).shop;
    if (!shop) {
      return reply.status(400).send({ error: "Missing shop param" });
    }

    const state = generateState();

    reply.setCookie(stateCookieName, state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    const url = buildInstallUrl(shop, state);
    return reply.redirect(url);
  });

  app.get("/shopify/callback", async (req, reply) => {
    const { shop, code } = assertValidCallback(req.query, req.cookies);

    const token = await exchangeCodeForToken(shop, code);

    await saveShopToken({
      shop,
      accessToken: token.access_token,
      scope: token.scope,
    });

    return reply.send({ ok: true, shop });
  });

  app.get("/shopify/connection", async (req, reply) => {
    const shop = (req.query as any).shop;
    if (!shop) {
      return reply.status(400).send({ error: "Missing shop param" });
    }

    return reply.send({ shop, connected: true });
  });
}
