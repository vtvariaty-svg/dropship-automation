import type { FastifyInstance } from "fastify";
import { ShopifyAdminClient } from "../integrations/shopify/adminClient";

export async function shopifyAdminRoutes(app: FastifyInstance) {
  app.get("/shopify/admin/whoami", async (req, reply) => {
    if (!req.shopContext) {
      return reply.code(401).send({ ok: false, error: "No shop context" });
    }

    const client = new ShopifyAdminClient({
      shop: req.shopContext.shop,
      accessToken: req.shopContext.accessToken,
    });

    const data = await client.graphql<{
      shop: {
        name: string;
        myshopifyDomain: string;
        primaryDomain?: { url: string } | null;
      };
    }>(`
      query {
        shop {
          name
          myshopifyDomain
          primaryDomain { url }
        }
      }
    `);

    return reply.send({ ok: true, shop: data.shop });
  });
}
