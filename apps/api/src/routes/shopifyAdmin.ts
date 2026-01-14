import { FastifyPluginAsync } from "fastify";
import { env } from "../env";
import { createAdminClient } from "../integrations/shopify/adminClient";
import { getShopToken } from "../integrations/shopify/store";

export const shopifyAdminRoutes: FastifyPluginAsync = async (app) => {
  // GET /shopify/admin/whoami?shop=xxx.myshopify.com
  app.get("/shopify/admin/whoami", async (req) => {
    const { shop } = req.query as { shop?: string };
    if (!shop) return { ok: false, error: "Missing shop" };

    const token = await getShopToken(shop);
    if (!token) return { ok: false, error: "No access token for shop" };

    const admin = createAdminClient({
      shop,
      accessToken: token,
      apiVersion: env.SHOPIFY_API_VERSION,
    });

    // REST simples pra validar
    const result = await admin.rest<{ shop: any }>("/shop.json");
    return { ok: true, shop: result.shop };
  });

  // GET /shopify/admin/graphql/ping?shop=xxx.myshopify.com
  // Faz uma query GraphQL mínima
  app.get("/shopify/admin/graphql/ping", async (req) => {
    const { shop } = req.query as { shop?: string };
    if (!shop) return { ok: false, error: "Missing shop" };

    const token = await getShopToken(shop);
    if (!token) return { ok: false, error: "No access token for shop" };

    const admin = createAdminClient({ shop, accessToken: token });

    const data = await admin.graphql<{ shop: { name: string } }>(`
      query {
        shop { name }
      }
    `);

    return { ok: true, data };
  });
};
