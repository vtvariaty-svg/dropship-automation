import type { FastifyInstance } from "fastify";
import { buildInstallUrl, exchangeCodeForToken, randomState, validateHmac } from "../integrations/shopify/oauth";

function requireQueryString(query: any, key: string): string {
  const v = query?.[key];
  if (!v || typeof v !== "string") throw new Error(`Missing or invalid query param: ${key}`);
  return v;
}

export async function shopifyRoutes(app: FastifyInstance) {
  // Inicia instalação
  app.get("/shopify/install", async (req, reply) => {
    try {
      const shop = requireQueryString(req.query, "shop");

      const state = randomState(16);
      // cookie pro callback validar state (se você quiser validar depois)
      reply.setCookie("shopify_oauth_state", state, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: true,
      });

      const url = buildInstallUrl({ shop, state });
      return reply.status(302).redirect(url);
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ ok: false, error: err?.message ?? "Bad Request" });
    }
  });

  // Callback OAuth
  app.get("/shopify/callback", async (req, reply) => {
    try {
      const shop = requireQueryString(req.query, "shop");
      const code = requireQueryString(req.query, "code");

      // (Opcional) validar state contra cookie
      // const state = requireQueryString(req.query, "state");
      // const cookieState = (req.cookies as any)?.shopify_oauth_state;
      // if (!cookieState || cookieState !== state) throw new Error("Invalid OAuth state");

      // valida HMAC (recomendado)
      if (!validateHmac(req.query as any)) {
        throw new Error("Invalid Shopify HMAC");
      }

      const token = await exchangeCodeForToken({ shop, code });

      // Aqui você salva no DB depois (Shop Context Loader vai usar isso)
      // Ex: await upsertShopifyConnection({ shop, accessToken: token.access_token, scope: token.scope })

      return reply.send({
        ok: true,
        shop,
        scope: token.scope ?? null,
        message: "OAuth success. Access token acquired.",
      });
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({ ok: false, error: err?.message ?? "OAuth error" });
    }
  });
}
