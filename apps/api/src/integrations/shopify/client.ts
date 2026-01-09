import { adminGraphQLEndpoint } from "./oauth";

export async function shopifyGraphQL<T>(params: {
  shop: string;
  accessToken: string;
  query: string;
  variables?: any;
}): Promise<T> {
  const res = await fetch(adminGraphQLEndpoint(params.shop), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": params.accessToken,
    },
    body: JSON.stringify({ query: params.query, variables: params.variables }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Shopify GraphQL failed: ${res.status} ${text}`);

  const json = JSON.parse(text);
  if (json.errors) throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);

  return json.data as T;
}
