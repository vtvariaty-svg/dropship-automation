// apps/api/src/routes/shopifyAdmin.ts
import { FastifyPluginAsync } from "fastify";
import { getShopToken } from "../integrations/shopify/store";

export const shopifyAdminRoutes: FastifyPluginAsync = async (app) => {
  app.get("/admin/shopify/token/:shop", async (req, reply) => {
    const { shop } = req.params as { shop: string };

    const token = await getShopToken(shop);

    return reply.send({
      shop,
      hasToken: Boolean(token),
      accessToken: token ?? null,
    });
  });
};
