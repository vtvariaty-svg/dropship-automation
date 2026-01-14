import { adminGraphQLEndpoint, adminRestBase, DEFAULT_API_VERSION, normalizeShop } from "./oauth";

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: any }>;
};

export class ShopifyAdminClient {
  private shop: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(params: { shop: string; accessToken: string; apiVersion?: string }) {
    this.shop = normalizeShop(params.shop);
    this.accessToken = params.accessToken;
    this.apiVersion = params.apiVersion ?? DEFAULT_API_VERSION;
  }

  async graphql<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const url = adminGraphQLEndpoint(this.shop, this.apiVersion);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = (await res.json()) as GraphQLResponse<T>;

    if (!res.ok) {
      throw new Error(`Shopify GraphQL HTTP ${res.status}: ${JSON.stringify(json)}`);
    }
    if (json.errors?.length) {
      throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
    }
    if (!json.data) {
      throw new Error("Shopify GraphQL: empty data");
    }

    return json.data;
  }

  async restGet<T>(path: string): Promise<T> {
    const base = adminRestBase(this.shop, this.apiVersion);
    const url = `${base}${path}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.accessToken,
      },
    });

    const json = (await res.json()) as T;

    if (!res.ok) {
      throw new Error(`Shopify REST HTTP ${res.status}: ${JSON.stringify(json)}`);
    }

    return json;
  }
}
