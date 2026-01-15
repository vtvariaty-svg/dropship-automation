// apps/api/src/integrations/shopify/adminClient.ts
import { env } from "../../env";

export type ShopifyAdminClientInit = {
  shop: string;
  accessToken: string;
  apiVersion?: string;
};

export type ShopifyGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: unknown }>;
};

export class ShopifyAdminClient {
  public readonly shop: string;
  public readonly accessToken: string;
  public readonly apiVersion: string;

  constructor(init: ShopifyAdminClientInit) {
    this.shop = init.shop;
    this.accessToken = init.accessToken;
    this.apiVersion = init.apiVersion ?? env.SHOPIFY_API_VERSION ?? "2024-10";
  }

  private adminGraphQLEndpoint(): string {
    return `https://${this.shop}/admin/api/${this.apiVersion}/graphql.json`;
  }

  private adminRestBase(): string {
    return `https://${this.shop}/admin/api/${this.apiVersion}`;
  }

  async graphql<T = unknown>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<ShopifyGraphQLResponse<T>> {
    const res = await fetch(this.adminGraphQLEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.accessToken,
      },
      body: JSON.stringify({ query, variables: variables ?? {} }),
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // se não for JSON, estoura como erro útil
      throw new Error(
        `Shopify GraphQL non-JSON response (${res.status}): ${text.slice(0, 300)}`
      );
    }

    return json as ShopifyGraphQLResponse<T>;
  }

  // REST helper (pra evitar erro "rest does not exist")
  async rest<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown
  ): Promise<{ status: number; data: T; raw: string }> {
    // path pode vir com ou sem /, com ou sem .json
    const normalized =
      path.startsWith("/") ? path : `/${path}`;
    const finalPath = normalized.endsWith(".json")
      ? normalized
      : `${normalized}.json`;

    const url = `${this.adminRestBase()}${finalPath}`;

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.accessToken,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const raw = await res.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw as any;
    }

    return { status: res.status, data: data as T, raw };
  }
}

// compat: alguns lugares podem chamar createAdminClient()
export function createAdminClient(init: ShopifyAdminClientInit): ShopifyAdminClient {
  return new ShopifyAdminClient(init);
}
