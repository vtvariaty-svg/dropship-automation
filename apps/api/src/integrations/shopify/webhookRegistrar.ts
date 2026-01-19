// apps/api/src/integrations/shopify/webhookRegistrar.ts
import type { EnsureWebhooksArgs, EnsureWebhooksResult } from "../../platforms/types";
import { shopifyGraphQL } from "./client";

const TOPICS: string[] = [
  "APP_UNINSTALLED",
  // adicione outros depois:
  // "PRODUCTS_CREATE",
  // "PRODUCTS_UPDATE",
];

export async function ensureShopifyWebhooks(args: EnsureWebhooksArgs): Promise<EnsureWebhooksResult> {
  const created: string[] = [];
  const errors: Array<{ topic?: string; message: string }> = [];

  for (const topic of TOPICS) {
    try {
      const callbackUrl = `${args.webhookUrlBase}/shopify/webhooks`;

      const mutation = `
        mutation WebhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $callbackUrl: URL!) {
          webhookSubscriptionCreate(topic: $topic, webhookSubscription: { callbackUrl: $callbackUrl, format: JSON }) {
            webhookSubscription { id topic }
            userErrors { field message }
          }
        }
      `;

      const data = await shopifyGraphQL<{
        webhookSubscriptionCreate: {
          webhookSubscription: { id: string; topic: string } | null;
          userErrors: Array<{ field?: string[]; message: string }>;
        };
      }>(args.shop, args.accessToken, mutation, { topic, callbackUrl });

      const uerr = data.webhookSubscriptionCreate.userErrors || [];
      if (uerr.length) {
        errors.push({ topic, message: uerr.map((e) => e.message).join(" | ") });
        continue;
      }

      if (data.webhookSubscriptionCreate.webhookSubscription?.id) {
        created.push(topic);
      }
    } catch (e: any) {
      errors.push({ topic, message: String(e?.message || e) });
    }
  }

  return { ok: errors.length === 0, created, errors: errors.length ? errors : undefined };
}
