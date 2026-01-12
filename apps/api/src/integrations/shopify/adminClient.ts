import { env } from "../../env";

export type ShopifyGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: unknown }>;
};

export class ShopifyAdminClient {
  private shop: string;
  private accessToken: string;

  constructor(params: { shop: string; accessToken: string }) {
    this.shop = params.shop;
    this.accessToken = params.accessToken;
  }

  private graphqlUrl(): string {
    return `https://${this.shop}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
  }

  private async sleep(ms: number) {
    await new Promise((r) => setTimeout(r, ms));
  }

  private computeBackoffMs(attempt: number): number {
    // 1.5s, 3s, 6s, 12s... cap 15s
    return Math.min(1500 * Math.pow(2, attempt), 15000);
  }

  async graphql<T>(
    query: string,
    variables: Record<string, unknown> = {},
    opts: { retries?: number } = {}
  ): Promise<T> {
    const retries = typeof opts.retries === "number" ? opts.retries : 3;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const res = await fetch(this.graphqlUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": this.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      });

      // Retry em 429 (rate limit) e 5xx
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        const retryAfterHeader = res.headers.get("retry-after");
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 0;
        const backoffMs = this.computeBackoffMs(attempt);
        const waitMs = Math.max(retryAfterMs, backoffMs);

        if (attempt === retries) {
          const body = await res.text().catch(() => "");
          throw new Error(`Shopify GraphQL failed. status=${res.status} body=${body}`);
        }

        await this.sleep(waitMs);
        continue;
      }

      const json = (await res.json().catch(() => ({}))) as ShopifyGraphQLResponse<T>;

      if (!res.ok) {
        throw new Error(
          `Shopify GraphQL HTTP error. status=${res.status} message=${
            json.errors?.[0]?.message ?? "unknown"
          }`
        );
      }

      if (json.errors?.length) {
        throw new Error(`Shopify GraphQL errors: ${json.errors.map((e) => e.message).join(" | ")}`);
      }

      if (!json.data) {
        throw new Error("Shopify GraphQL: missing data");
      }

      return json.data;
    }

    // unreachable
    throw new Error("Shopify GraphQL: unexpected");
  }
}
