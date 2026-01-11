// apps/api/src/integrations/shopify/client.ts
import { env } from "../../env";
import { normalizeShop, validateShopParam } from "./oauth";

export type ShopifyGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: any }>;
};

function endpoint(shopRaw: string): string {
  const shop = normalizeShop(shopRaw);
  validateShopParam(shop);
  return `https://${shop}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
}

export async function shopifyGraphql<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, any>
): Promise<ShopifyGraphQLResponse<T>> {
  const res = await fetch(endpoint(shop), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables: variables ?? {} }),
  });

  const json = (await res.json()) as ShopifyGraphQLResponse<T>;

  if (!res.ok) {
    const msg = json?.errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new Error(`Shopify GraphQL error: ${msg}`);
  }

  return json;
}
