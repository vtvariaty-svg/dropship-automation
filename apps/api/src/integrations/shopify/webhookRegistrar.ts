import { ShopifyAdminClient } from "./adminClient";

export async function ensureCoreWebhooks(params: {
  client: ShopifyAdminClient;
  callbackBaseUrl: string;
}) {
  const mutation = `
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $url: URL!) {
      webhookSubscriptionCreate(
        topic: $topic,
        webhookSubscription: { callbackUrl: $url, format: JSON }
      ) {
        userErrors { field message }
      }
    }
  `;

  const topics = ["APP_UNINSTALLED"];

  for (const topic of topics) {
    const res = await params.client.graphql<{
      webhookSubscriptionCreate: {
        userErrors: { message: string }[];
      };
    }>(mutation, {
      topic,
      url: `${params.callbackBaseUrl}/shopify/webhooks`,
    });

    if (res.webhookSubscriptionCreate.userErrors.length) {
      throw new Error(
        `Webhook error: ${JSON.stringify(
          res.webhookSubscriptionCreate.userErrors
        )}`
      );
    }
  }

  return { ok: true };
}
