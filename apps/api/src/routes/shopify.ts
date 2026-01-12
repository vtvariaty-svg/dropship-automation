import type { FastifyInstance } from "fastify";
import { env } from "../env";
import {
  buildInstallUrl,
  exchangeCodeForToken,
  isValidShop,
  randomState,
  verifyHmac,
} from "../integrations/shopify/oauth";
import { upsertShopifyConnection } from "../integrations/shopify/store";

export async function shopifyRoutes(app: FastifyInstance) {
  app.get("/shopify/install", async (req, reply) => {
    const shop = String((req.query as any)?.shop ?? "").trim();
    if (!isValidShop(shop)) {
      return reply.code(400).send({ ok: false, error: "Invalid shop" });
    }

    const state = randomState();
    reply.setCookie("shopify_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });

    const redirectUrl = buildInstallUrl(shop, state);
    return reply.redirect(302, redirectUrl);
  });

  app.get("/shopify/callback", async (req, reply) => {
    const q = req.query as Record<string, any>;
    const shop = String(q.shop ?? "");
    const code = String(q.code ?? "");
    const state = String(q.state ?? "");

    if (!isValidShop(shop) || !code) {
      return reply.code(400).send({ ok: false, error: "Invalid callback params" });
    }

    const cookieState = (req.cookies as any)?.shopify_state;
    if (!cookieState || cookieState !== state) {
      return reply.code(401).send({ ok: false, error: "Invalid state" });
    }

    if (!verifyHmac(q)) {
      return reply.code(401).send({ ok: false, error: "Invalid HMAC" });
    }

    const accessToken = await exchangeCodeForToken(shop, code);

    await upsertShopifyConnection({
      shop,
      accessToken,
      scopes: env.SHOPIFY_SCOPES,
    });

    reply.clearCookie("shopify_state", { path: "/" });

    return reply.send({ ok: true, shop });
  });
}
