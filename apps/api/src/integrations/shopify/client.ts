import { adminGraphQLEndpoint } from "./oauth";

export async function shopifyGraphQL(args: {
  shop: string;
  accessToken: string;
  query: string;
  variables?: Record<string, unknown>;
}): Promise<any> {
  const { shop, accessToken, query, variables } = args;

  const resp = await fetch(adminGraphQLEndpoint(shop), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-shopify-access-token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    throw new Error(`Shopify GraphQL HTTP ${resp.status}: ${JSON.stringify(json)}`);
  }

  if (json?.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json;
}

/**
 * Aliases para compatibilidade com nomes antigos (evita quebrar build).
 */
export const shopifyGraphql = shopifyGraphQL;
export const shopifyGraphQL_ = shopifyGraphQL;
