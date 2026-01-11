import type { FastifyInstance } from "fastify";
import { env } from "../env";
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  normalizeShop,
  randomState,
  validateHmac,
} from "../integrations/shopify/oauth";

/**
 * Rotas Shopify:
 * - GET /shopify/install?shop=cliquebuydev.myshopify.com
 * - GET /shopify/callback
 */
export async function shopifyRoutes(app: FastifyInstance) {
  // sanity
  app.get("/shopify", async () => {
    return {
      ok: true,
      message: "Shopify routes online",
      baseUrl: env.BASE_URL,
      redirectUri: env.SHOPIFY_REDIRECT_URI,
      scopes: env.SHOPIFY_SCOPES,
      apiVersion: env.SHOPIFY_API_VERSION,
    };
  });

  /**
   * Inicia instalação (redireciona pro Shopify /oauth/authorize)
   */
  app.get("/shopify/install", async (req, reply) => {
    const q = req.query as { shop?: string };

    if (!q?.shop) {
      reply.code(400);
      return { ok: false, error: "Missing query param: shop" };
    }

    const shop = normalizeShop(q.shop);
    const state = randomState();

    const authorizeUrl = buildAuthorizeUrl({
      shop,
      state,
      scopes: env.SHOPIFY_SCOPES,
      redirectUri: env.SHOPIFY_REDIRECT_URI,
    });

    // Se você tiver cookie plugin no Fastify, dá pra salvar state em cookie.
    // Como não vou assumir plugin, a gente só envia state junto e valida HMAC no callback.
    return reply.redirect(authorizeUrl);
  });

  /**
   * Callback do Shopify (valida HMAC + troca code por token)
   */
  app.get("/shopify/callback", async (req, reply) => {
    const query = req.query as Record<string, any>;

    const shop = String(query.shop ?? "");
    const code = String(query.code ?? "");

    if (!shop || !code) {
      reply.code(400);
      return { ok: false, error: "Missing shop or code in callback" };
    }

    // valida HMAC
    const ok = validateHmac(query);
    if (!ok) {
      reply.code(401);
      return { ok: false, error: "Invalid HMAC" };
    }

    const normalizedShop = normalizeShop(shop);

    // troca code por token
    const token = await exchangeCodeForToken({
      shop: normalizedShop,
      code,
    });

    /**
     * Aqui é onde você vai plugar o "Shop Context Loader":
     * - salvar/atualizar token por shop no banco
     * - criar tenant/shop record
     *
     * Por enquanto, retorna sucesso (pra você confirmar fluxo).
     */
    return {
      ok: true,
      shop: normalizedShop,
      scope: token.scope,
      message: "OAuth success. Token received (store it in DB next).",
    };
  });
}
