// apps/api/src/integrations/shopify/client.ts
import { adminGraphQLEndpoint } from "./oauth";

export async function shopifyGraphQL<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(adminGraphQLEndpoint(shop), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as any;

  if (!res.ok || json.errors) {
    throw new Error(`Shopify GraphQL error: ${JSON.stringify(json)}`);
  }

  return json.data as T;
}

/**
 * Export que seus erros citam.
 * Isso evita “no exported member createShopifyAdminClient”.
 */
export function createShopifyAdminClient(args: { shop: string; accessToken: string }) {
  return {
    graphql: <T>(query: string, variables?: Record<string, unknown>) =>
      shopifyGraphQL<T>(args.shop, args.accessToken, query, variables),
  };
}
