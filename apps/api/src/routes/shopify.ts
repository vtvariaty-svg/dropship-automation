import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { randomState, verifyHmac, buildInstallUrl } from "../integrations/shopify/oauth";
import { exchangeCodeForToken } from "../integrations/shopify/token";
import { upsertShopifyConnection } from "../integrations/shopify/store";

const TENANT_ID = 1;

export async function shopifyRoutes(app: FastifyInstance) {
  app.get("/shopify/auth", async (req, reply) => {
    const shop = String((req.query as any).shop ?? "").trim();

    if (!shop || !shop.endsWith(".myshopify.com")) {
      return reply.code(400).send({ ok: false, error: "Invalid shop. Use *.myshopify.com" });
    }

    const state = randomState();

    reply.setCookie("shopify_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    const redirectUri = `${env.BASE_URL}/shopify/callback`;

    const url = buildInstallUrl({ shop, state, redirectUri });
    return reply.redirect(url);
  });

  app.get("/shopify/callback", async (req, reply) => {
    const q = req.query as any;

    if (!verifyHmac(q)) {
      return reply.code(400).send({ ok: false, error: "Invalid HMAC" });
    }

    const shop = String(q.shop ?? "");
    const code = String(q.code ?? "");
    const state = String(q.state ?? "");

    const cookieState = (req.cookies as any).shopify_oauth_state;
    if (!cookieState || cookieState !== state) {
      return reply.code(400).send({ ok: false, error: "Invalid state" });
    }

    const tok = await exchangeCodeForToken({ shop, code });

    const expiresAt =
      typeof tok.expires_in === "number" ? new Date(Date.now() + tok.expires_in * 1000) : null;

    await upsertShopifyConnection({
      tenantId: TENANT_ID,
      shop,
      scope: tok.scope ?? env.SHOPIFY_SCOPES,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token ?? null,
      expiresAt,
    });

    return reply.send({
      ok: true,
      shop,
      scope: tok.scope ?? env.SHOPIFY_SCOPES,
      message: "Shopify connected",
    });
  });
}
