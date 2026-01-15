import {
  adminGraphQLEndpoint,
  normalizeShop,
  DEFAULT_API_VERSION,
} from "./oauth";

/* =========================
   CLIENT
========================= */

export class ShopifyAdminClient {
  private shop: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(params: {
    shop: string;
    accessToken: string;
    apiVersion?: string;
  }) {
    this.shop = normalizeShop(params.shop);
    this.accessToken = params.accessToken;
    this.apiVersion = params.apiVersion ?? DEFAULT_API_VERSION;
  }

  async graphql<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const res = await fetch(
      adminGraphQLEndpoint(this.shop, this.apiVersion),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": this.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      }
    );

    const json = await res.json();

    if (!res.ok || json.errors) {
      throw new Error(
        `Shopify GraphQL error: ${JSON.stringify(json.errors || json)}`
      );
    }

    return json.data as T;
  }
}

/* =========================
   FACTORY (LEGACY SUPPORT)
========================= */

export function createAdminClient(params: {
  shop: string;
  accessToken: string;
}) {
  return new ShopifyAdminClient(params);
}
