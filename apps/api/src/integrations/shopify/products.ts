// apps/api/src/integrations/shopify/products.ts
import { shopifyGraphQL } from "./client";

export type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  status: string;
  vendor?: string;
};

export async function fetchShopifyProducts(
  shop: string,
  accessToken: string,
  first = 20
): Promise<ShopifyProduct[]> {
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
    products: {
      edges: Array<{
        node: ShopifyProduct;
      }>;
    };
  }>(shop, accessToken, query, { first });

  return data.products.edges.map((e) => e.node);
}
