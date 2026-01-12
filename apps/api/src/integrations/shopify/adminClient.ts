import { env } from "../../env";

export type ShopifyGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: any }>;
};

export class ShopifyAdminClient {
  private shop: string;
  private accessToken: string;

  constructor(params: { shop: string; accessToken: string }) {
    this.shop = params.shop;
    this.accessToken = params.accessToken;
  }

  private get graphqlUrl() {
    return `https://${this.shop}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
  }

  private async sleep(ms: number) {
    await new Promise((r) => setTimeout(r, ms));
  }

  async graphql<T>(
    query: string,
    variables: Record<string, any> = {},
    opts: { retries?: number } = {}
  ): Promise<T> {
    const retries = typeof opts.retries === "number" ? opts.retries : 3;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const res = await fetch(this.graphqlUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": this.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      });

      // 429 / 5xx: retry com backoff
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        const retryAfterHeader = res.headers.get("retry-after");
        const retryAfter = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 0;
        const backoff = Math.min(1500 * Math.pow(2, attempt), 15000);
        const wait = Math.max(retryAfter, backoff);

        if (attempt === retries) {
          const text = await res.text().catch(() => "");
          throw new Error(`Shopify GraphQL failed after retries. status=${res.status} body=${text}`);
        }

        await this.sleep(wait);
        continue;
      }

      const json = (await res.json()) as ShopifyGraphQLResponse<T>;

      if (!res.ok) {
        throw new Error(
          `Shopify GraphQL error status=${res.status} message=${json.errors?.[0]?.message ?? "unknown"}`
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
