import { DEFAULT_API_VERSION, normalizeShop } from "./oauth";

export type ShopifyAdminClient = {
  shop: string;
  accessToken: string;
  apiVersion: string;
  graphql: <T = unknown>(query: string, variables?: Record<string, unknown>) => Promise<T>;
  rest: {
    request: <T = unknown>(params: {
      method: "GET" | "POST" | "PUT" | "DELETE";
      path: string; // ex: "shop" ou "products/123"
      query?: Record<string, string | number | boolean>;
      body?: unknown;
    }) => Promise<T>;
  };
};

export function createAdminClient(params: {
  shop: string;
  accessToken: string;
  apiVersion?: string;
}): ShopifyAdminClient {
  const shop = normalizeShop(params.shop);
  const apiVersion = params.apiVersion || DEFAULT_API_VERSION;
  const accessToken = params.accessToken;

  async function graphql<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const resp = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = (await resp.json().catch(() => null)) as any;

    if (!resp.ok) {
      throw new Error(`Shopify GraphQL error: ${resp.status} ${JSON.stringify(json)}`);
    }

    if (json?.errors?.length) {
      throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
    }

    return json?.data as T;
  }

  async function restRequest<T = unknown>(req: {
    method: "GET" | "POST" | "PUT" | "DELETE";
    path: string;
    query?: Record<string, string | number | boolean>;
    body?: unknown;
  }): Promise<T> {
    const url = new URL(`https://${shop}/admin/api/${apiVersion}/${req.path}.json`);
    if (req.query) {
      for (const [k, v] of Object.entries(req.query)) url.searchParams.set(k, String(v));
    }

    const resp = await fetch(url.toString(), {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: req.body ? JSON.stringify(req.body) : undefined,
    });

    const json = (await resp.json().catch(() => null)) as any;

    if (!resp.ok) {
      throw new Error(`Shopify REST error: ${resp.status} ${JSON.stringify(json)}`);
    }

    return json as T;
  }

  return {
    shop,
    accessToken,
    apiVersion,
    graphql,
    rest: { request: restRequest },
  };
}
