// apps/api/src/routes/shopifyProducts.ts
import type { FastifyInstance } from "fastify";
import { getShopToken } from "../integrations/shopify/store";
import { fetchShopifyProducts } from "../integrations/shopify/products";

export async function shopifyProductsRoutes(app: FastifyInstance) {
  app.get("/shopify/products", async (request, reply) => {
    const q = request.query as any;
    const shop = q?.shop as string | undefined;

    if (!shop) {
      return reply.status(400).send({
        ok: false,
        error: "Missing required query param: shop",
      });
    }

    const tokenRow = await getShopToken(shop);

    if (!tokenRow || !tokenRow.access_token) {
      return reply.status(404).send({
        ok: false,
        error: "Shop not authenticated",
      });
    }

    try {
      const products = await fetchShopifyProducts(shop, tokenRow.access_token);

      return reply.send({
        ok: true,
        shop,
        count: products.length,
        products,
      });
    } catch (err: any) {
      const msg = String(err?.message || err);

      // Mantém simples e claro (sem “adivinhar” demais)
      if (msg.includes("401") || msg.includes("403")) {
        return reply.status(401).send({
          ok: false,
          error: "Unauthorized Shopify Admin API request",
          details: msg,
        });
      }

      return reply.status(500).send({
        ok: false,
        error: "Failed to fetch products",
        details: msg,
      });
    }
  });
}
