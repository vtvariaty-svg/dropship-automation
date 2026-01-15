// apps/api/src/integrations/shopify/webhookRegistrar.ts
import { ShopifyAdminClient } from "./adminClient";

/**
 * Registra os webhooks essenciais do app via Admin GraphQL.
 *
 * Atualmente:
 * - APP_UNINSTALLED: dispara quando o lojista desinstala o app.
 */
export async function ensureCoreWebhooks(params: {
  client: ShopifyAdminClient;
  callbackBaseUrl: string;
}) {
  const { client } = params;
  const base = params.callbackBaseUrl.replace(/\/+$/g, "");
  const callbackUrl = `${base}/shopify/webhooks`;

  const topics: string[] = ["APP_UNINSTALLED"];

  const mutation = `
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $callbackUrl: URL!) {
      webhookSubscriptionCreate(
        topic: $topic,
        webhookSubscription: { callbackUrl: $callbackUrl, format: JSON }
      ) {
        webhookSubscription { id }
        userErrors { field message }
      }
    }
  `;

  for (const topic of topics) {
    const res = await client.graphql<{
      webhookSubscriptionCreate: {
        webhookSubscription: { id: string } | null;
        userErrors: Array<{ field: string[] | null; message: string }>;
      };
    }>(mutation, { topic, callbackUrl });

    const data = res.data;
    if (!data) throw new Error("Shopify GraphQL response missing data");
    const created = data.webhookSubscriptionCreate;

    if (created.userErrors?.length) {
      const msg = created.userErrors.map((e) => e.message).join("; ");
      throw new Error(`Webhook create failed for ${topic}: ${msg}`);
    }
  }

  return { ok: true, callbackUrl, topics };
}
