import { env } from "../../env";

export type ShopifyAdminClient = {
  request<T = any>(
    query: string,
    variables?: Record<string, any>
  ): Promise<T>;
};

/**
 * Cria um client GraphQL ADMIN para Shopify
 * USO OBRIGATÓRIO em TODO o projeto
 */
export function createShopifyAdminClient(params: {
  shop: string;
  accessToken: string;
}): ShopifyAdminClient {
  const { shop, accessToken } = params;

  if (!shop || !accessToken) {
    throw new Error("Shopify Admin Client: shop ou accessToken ausente");
  }

  const endpoint = `https://${shop}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;

  return {
    async request<T = any>(
      query: string,
      variables: Record<string, any> = {}
    ): Promise<T> {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Shopify GraphQL HTTP ${res.status}: ${text}`
        );
      }

      const json = await res.json();

      if (json.errors) {
        throw new Error(
          `Shopify GraphQL Error: ${JSON.stringify(json.errors)}`
        );
      }

      return json.data as T;
    },
  };
}
