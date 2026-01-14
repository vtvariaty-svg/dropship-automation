import { env } from "../../env";

type Json = Record<string, unknown>;

export class ShopifyAdminClient {
  private shop: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(params: { shop: string; accessToken: string; apiVersion?: string }) {
    this.shop = params.shop;
    this.accessToken = params.accessToken;
    this.apiVersion = params.apiVersion ?? env.SHOPIFY_API_VERSION;
  }

  private baseUrl() {
    return `https://${this.shop}`;
  }

  async rest<T = any>(params: {
    method: "GET" | "POST" | "PUT" | "DELETE";
    path: string; // ex: /webhooks.json
    body?: unknown;
  }): Promise<T> {
    const url = `${this.baseUrl()}/admin/api/${this.apiVersion}${params.path}`;
    const res = await fetch(url, {
      method: params.method,
      headers: {
        "X-Shopify-Access-Token": this.accessToken,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: params.body ? JSON.stringify(params.body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Shopify REST ${params.method} ${params.path} failed: ${res.status} ${text}`);
    }

    return (await res.json()) as T;
  }

  async listWebhooks(): Promise<{ id: number; topic: string; address: string }[]> {
    const data = await this.rest<{ webhooks: { id: number; topic: string; address: string }[] }>({
      method: "GET",
      path: "/webhooks.json",
    });
    return data.webhooks ?? [];
  }

  async createWebhook(params: { topic: string; address: string }): Promise<{ id: number }> {
    const data = await this.rest<{ webhook: { id: number } }>({
      method: "POST",
      path: "/webhooks.json",
      body: {
        webhook: {
          topic: params.topic,
          address: params.address,
          format: "json",
        },
      },
    });
    return data.webhook;
  }
}

export function buildWebhookCallbackUrl() {
  // BASE_URL deve ser https://... (Render)
  const base = env.BASE_URL.replace(/\/$/, "");
  return `${base}/shopify/webhooks`;
}
