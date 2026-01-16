// apps/api/src/routes/admin.ts
import { FastifyPluginAsync } from "fastify";
import { getShopToken } from "../integrations/shopify/store";

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get("/admin/shop-token/:shop", async (req, reply) => {
    const { shop } = req.params as { shop: string };

    const token = await getShopToken(shop);

    return reply.send({
      shop,
      hasToken: Boolean(token),
      accessToken: token ?? null,
    });
  });
};
