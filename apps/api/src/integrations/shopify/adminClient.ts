import { env } from "../../env";
import {
  buildAdminGraphQLEndpoint,
  buildAdminRestBase,
  normalizeShopDomain,
} from "./oauth";

export type ShopifyAdminClient = {
  shop: string;
  apiVersion: string;
  accessToken: string;
  graphql<T = unknown>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T>;
  rest<T = unknown>(path: string, init?: RequestInit): Promise<T>;
};

export function createShopifyAdminClient(opts: {
  shop: string;
  accessToken: string;
  apiVersion?: string;
}): ShopifyAdminClient {
  const shop = normalizeShopDomain(opts.shop);
  const apiVersion = opts.apiVersion ?? env.SHOPIFY_API_VERSION;
  const accessToken = opts.accessToken;

  const graphqlEndpoint = buildAdminGraphQLEndpoint(shop, apiVersion);
  const restBase = buildAdminRestBase(shop, apiVersion);

  async function graphql<T = unknown>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const res = await fetch(graphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = (await res.json().catch(() => null)) as any;

    if (!res.ok) {
      const msg =
        json?.errors?.[0]?.message ??
        `GraphQL request failed: ${res.status} ${res.statusText}`;
      throw new Error(msg);
    }

    if (json?.errors?.length) {
      const msg = json.errors[0]?.message ?? "GraphQL error";
      throw new Error(msg);
    }

    return json?.data as T;
  }

  async function rest<T = unknown>(
    path: string,
    init?: RequestInit
  ): Promise<T> {
    const url = `${restBase}${path.startsWith("/") ? "" : "/"}${path}`;

    const res = await fetch(url, {
      ...init,
      headers: {
        "X-Shopify-Access-Token": accessToken,
        ...(init?.headers ?? {}),
      },
    });

    const text = await res.text().catch(() => "");
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const msg =
        data?.errors ??
        data?.error ??
        `REST request failed: ${res.status} ${res.statusText}`;
      throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    }

    return data as T;
  }

  return { shop, apiVersion, accessToken, graphql, rest };
}

// Alias compatível com imports antigos (pra não quebrar)
export const createAdminClient = createShopifyAdminClient;
