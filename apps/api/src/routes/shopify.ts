import type { FastifyInstance } from "fastify";
import { env } from "../env";
import {
  buildInstallUrl,
  normalizeShop,
  randomState,
  verifyHmac,
  exchangeCodeForToken,
} from "../integrations/shopify/oauth";
import { saveShopToken } from "../integrations/shopify/store";

export async function shopifyRoutes(app: FastifyInstance) {
  // /shopify/install?shop=xxx.myshopify.com
  app.get("/install", async (req, reply) => {
    const shopRaw = String((req.query as any)?.shop ?? "");
    const shop = normalizeShop(shopRaw);

    if (!shop) {
      return reply.status(400).send({ ok: false, error: "Missing shop" });
    }

    const state = randomState();
    reply.setCookie("shopify_oauth_state", state, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
    });

    const installUrl = buildInstallUrl({
      shop,
      clientId: env.SHOPIFY_CLIENT_ID,
      redirectUri: env.SHOPIFY_REDIRECT_URI,
      scopesCsv: env.SHOPIFY_SCOPES,
      state,
    });

    return reply.redirect(installUrl);
  });

  // /shopify/callback?code=...&shop=...&hmac=...&state=...
  app.get("/callback", async (req, reply) => {
    const q = (req.query as any) ?? {};
    const shop = normalizeShop(String(q.shop ?? ""));
    const code = String(q.code ?? "");
    const state = String(q.state ?? "");

    if (!shop || !code) {
      return reply.status(400).send({ ok: false, error: "Missing shop or code" });
    }

    const savedState = String((req.cookies as any)?.shopify_oauth_state ?? "");
    if (!savedState || savedState !== state) {
      return reply.status(401).send({ ok: false, error: "Invalid state" });
    }

    const hmacOk = verifyHmac({
      query: q,
      clientSecret: env.SHOPIFY_CLIENT_SECRET,
    });
    if (!hmacOk) {
      return reply.status(401).send({ ok: false, error: "Invalid HMAC" });
    }

    const tokenRes = await exchangeCodeForToken({
      shop,
      code,
      clientId: env.SHOPIFY_CLIENT_ID,
      clientSecret: env.SHOPIFY_CLIENT_SECRET,
      redirectUri: env.SHOPIFY_REDIRECT_URI,
    });

    await saveShopToken({
      shop,
      accessToken: tokenRes.accessToken,
      scopes: tokenRes.scopes ?? env.SHOPIFY_SCOPES,
    });

    // aqui você pode redirecionar pra UI embutida depois
    return reply.send({
      ok: true,
      shop,
      scopes: tokenRes.scopes ?? env.SHOPIFY_SCOPES,
      message: "Shop installed and token stored",
    });
  });
}
