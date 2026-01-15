// apps/api/src/routes/shopifyAdmin.ts
import type { FastifyPluginAsync } from "fastify";
import { createAdminClient } from "../integrations/shopify/adminClient";
import { normalizeShop } from "../integrations/shopify/oauth";
import { getShopToken } from "../integrations/shopify/store";

export const shopifyAdminRoutes: FastifyPluginAsync = async (app) => {
  app.get("/shop", async (req, reply) => {
    const q = (req.query as { shop?: string }) || {};
    const shopRaw = (req.shopDomain as string | undefined) ?? q.shop;
    if (!shopRaw) {
      return reply.code(400).send({ error: "Missing shop" });
    }

    const shop = normalizeShop(shopRaw);
    const tokenRow = await getShopToken(shop);
    if (!tokenRow?.access_token) {
      return reply.code(401).send({ error: "No access token for this shop" });
    }

    const client = createAdminClient({ shop, accessToken: tokenRow.access_token });

    const query = `
      query ShopInfo {
        shop {
          name
          myshopifyDomain
          primaryDomain { url }
        }
      }
    `;

    const res = await client.graphql<{
      shop: {
        name: string;
        myshopifyDomain: string;
        primaryDomain: { url: string } | null;
      };
    }>(query);

    const data = res.data;
    if (!data) return reply.code(502).send({ error: "Shopify GraphQL response missing data" });

    return reply.send({ shop: data.shop });
  });
};
