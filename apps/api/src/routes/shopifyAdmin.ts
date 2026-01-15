import { FastifyPluginAsync } from "fastify";
import { createAdminClient } from "../integrations/shopify/adminClient";

type ShopContext = {
  shop: string;
  accessToken: string;
};

// Ajuste se teu plugin usa outro nome
declare module "fastify" {
  interface FastifyRequest {
    shopContext?: ShopContext;
  }
}

export const shopifyAdminRoutes: FastifyPluginAsync = async (app) => {
  app.get("/shopify/admin/whoami", async (request, reply) => {
    const ctx = request.shopContext;
    if (!ctx?.shop || !ctx?.accessToken) {
      return reply.code(401).send({ ok: false, error: "Missing shop context" });
    }

    const client = createAdminClient({
      shop: ctx.shop,
      accessToken: ctx.accessToken,
    });

    const data = await client.graphql<{
      shop: { name: string; myshopifyDomain: string; primaryDomain: { url: string } | null };
    }>(`
      query WhoAmI {
        shop {
          name
          myshopifyDomain
          primaryDomain { url }
        }
      }
    `);

    return reply.send({ ok: true, shop: data.shop });
  });
};
