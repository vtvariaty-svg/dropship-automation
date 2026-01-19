import type { FastifyPluginAsync } from "fastify";
import { normalizeShop } from "../integrations/shopify/oauth";
import { getShopToken } from "../integrations/shopify/store";
import { shopifyGraphql } from "../platforms/shopify/graphql";

export const shopifyAdminRoutes: FastifyPluginAsync = async (app) => {
  // Basic sanity check for the stored token + GraphQL connectivity
  app.get("/shop", async (req, reply) => {
    const shop = normalizeShop(String((req.query as any).shop || ""));
    if (!shop) return reply.code(400).send({ ok: false, error: "Missing shop" });

    const tokenRow = await getShopToken(shop);
    if (!tokenRow) return reply.code(404).send({ ok: false, error: "No token for shop" });

    const res = await shopifyGraphql({
      shop,
      accessToken: tokenRow.access_token,
      query: `query { shop { name myshopifyDomain } }`,
      variables: {},
    });

    return reply.send({ ok: true, shop, data: res.data });
  });

  // Products (simple listing) - used by the provisional admin page links
  // Example:
  //   GET /shopify/products?shop=...&first=10
  app.get("/shopify/products", async (req, reply) => {
    const shop = normalizeShop(String((req.query as any).shop || ""));
    const first = Math.max(1, Math.min(50, Number((req.query as any).first || 10)));

    if (!shop) return reply.code(400).send({ ok: false, error: "Missing shop" });

    const tokenRow = await getShopToken(shop);
    if (!tokenRow) return reply.code(404).send({ ok: false, error: "No token for shop" });

    const query = `
      query Products($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              status
              handle
              totalInventory
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    const gql = await shopifyGraphql({
      shop,
      accessToken: tokenRow.access_token,
      query,
      variables: { first },
    });

    const edges = (gql.data as any)?.products?.edges ?? [];
    const products = edges.map((e: any) => e.node);

    return reply.send({
      ok: true,
      shop,
      count: products.length,
      products,
    });
  });
};
