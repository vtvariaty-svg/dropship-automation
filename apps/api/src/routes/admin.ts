// apps/api/src/routes/admin.ts
import type { FastifyPluginAsync } from "fastify";
import { createAdminClient } from "../integrations/shopify/adminClient";
import { normalizeShop } from "../integrations/shopify/oauth";
import { getShopToken } from "../integrations/shopify/store";

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // Diagnóstico simples para testar Admin GraphQL usando o token salvo.
  app.get("/shop", async (req, reply) => {
    const q = (req.query ?? {}) as { shop?: string };
    if (!q.shop) return reply.code(400).send({ ok: false, error: "Missing shop" });

    const shop = normalizeShop(q.shop);
    const tokenRow = await getShopToken(shop);
    if (!tokenRow?.access_token) {
      return reply.code(401).send({ ok: false, error: "No token for shop" });
    }

    const client = createAdminClient({ shop, accessToken: tokenRow.access_token });
    const query = `
      query {
        shop {
          name
          myshopifyDomain
          primaryDomain { url }
        }
      }
    `;

    const response = await client.graphql<{
      shop: { name: string; myshopifyDomain: string; primaryDomain: { url: string } | null };
    }>(query);

    const data = response.data;
    if (!data) {
      return reply.code(502).send({ ok: false, error: "Shopify GraphQL response missing data" });
    }

    return reply.send({ ok: true, shop: data.shop });
  });
};
