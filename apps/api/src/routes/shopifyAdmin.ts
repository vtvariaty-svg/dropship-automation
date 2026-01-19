// apps/api/src/routes/shopifyAdmin.ts

import { FastifyInstance } from "fastify";
import { getShopToken } from "../integrations/shopify/store";
import { shopifyGraphQL } from "../integrations/shopify/client";

export async function shopifyAdminRoutes(app: FastifyInstance) {
  app.get("/shopify/products", async (req, reply) => {
    const shop = String((req.query as any).shop || "").toLowerCase();
    if (!shop) return reply.code(400).send({ error: "missing shop" });

    const token = await getShopToken(shop);
    if (!token) return reply.code(404).send({ error: "token not found for shop" });

    const data = await shopifyGraphQL<any>(
      shop,
      token.access_token,
      `
      query Products($first: Int!) {
        products(first: $first) {
          edges {
            node { id title handle status }
          }
        }
      }
      `,
      { first: 10 }
    );

    return reply.send({ ok: true, shop, data });
  });
}
