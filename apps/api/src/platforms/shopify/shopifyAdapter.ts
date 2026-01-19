import { adminGraphQLEndpoint } from "../../integrations/shopify/oauth";
import { getShopToken, cleanupShopOnUninstall } from "../../integrations/shopify/store";

export class ShopifyAdapter {
  async getAccessToken(shop: string): Promise<string> {
    const token = await getShopToken(shop);
    if (!token) {
      throw new Error(`No token found for shop ${shop}`);
    }
    return token.access_token;
  }

  async adminGraphQL<T>(
    shop: string,
    query: string,
    variables?: Record<string, any>
  ): Promise<T> {
    const accessToken = await this.getAccessToken(shop);

    const res = await fetch(adminGraphQLEndpoint(shop), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      throw new Error(`Shopify GraphQL error (${res.status})`);
    }

    const json = await res.json();
    return json.data as T;
  }

  async handleUninstall(shop: string) {
    await cleanupShopOnUninstall(shop);
  }
}
