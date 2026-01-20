// apps/api/src/routes/shopifyProducts.ts
import { FastifyPluginAsync } from "fastify";
import { getShopToken } from "../integrations/shopify/store";
import { shopifyGraphQL } from "../integrations/shopify/client";

type ShopifyProductNode = {
  id: string;
  title: string;
  handle: string;
  status: string;
  vendor?: string;
};

export const shopifyProductsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/shopify/products", async (request, reply) => {
    const shop = String((request.query as any)?.shop || "").trim();

    if (!shop) {
      return reply.code(400).send({
        ok: false,
        error: "Missing required query param: shop",
      });
    }

    const tokenRow = await getShopToken(shop);

    if (!tokenRow?.access_token) {
      return reply.code(404).send({
        ok: false,
        error: "Shop not authenticated",
      });
    }

    try {
      const query = `
        query Products($first: Int!) {
          products(first: $first) {
            edges {
              node {
                id
                title
                handle
                status
                vendor
              }
            }
          }
        }
      `;

      const data = await shopifyGraphQL<{
        products: { edges: Array<{ node: ShopifyProductNode }> };
      }>(shop, tokenRow.access_token, query, { first: 20 });

      const products = data.products.edges.map((e) => e.node);

      return reply.send({
        ok: true,
        shop,
        count: products.length,
        products,
      });
    } catch (err: any) {
      const msg = String(err?.message || err);

      // shopifyGraphQL já lança erro com payload do GraphQL,
      // aqui só retornamos claro para debug.
      return reply.code(500).send({
        ok: false,
        error: "Failed to fetch products from Shopify Admin API",
        details: msg,
      });
    }
  });
};
