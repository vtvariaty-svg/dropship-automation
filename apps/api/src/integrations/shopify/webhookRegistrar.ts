import { ShopifyAdminClient } from "./adminClient";

export type WebhookToRegister = {
  topic: string; // ex: "app/uninstalled"
  callbackUrl: string;
};

export async function registerWebhooks(client: ShopifyAdminClient, webhooks: WebhookToRegister[]) {
  // Admin GraphQL mutation oficial: webhookSubscriptionCreate
  const mutation = `
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $callbackUrl: URL!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: { callbackUrl: $callbackUrl, format: JSON }) {
        webhookSubscription { id topic endpoint { __typename } }
        userErrors { field message }
      }
    }
  `;

  for (const w of webhooks) {
    const variables = {
      topic: topicToGraphQLEnum(w.topic),
      callbackUrl: w.callbackUrl,
    };

    const data = await client.graphql<{
      webhookSubscriptionCreate: {
        webhookSubscription: { id: string; topic: string } | null;
        userErrors: Array<{ field: string[] | null; message: string }>;
      };
    }>(mutation, variables);

    const errors = data.webhookSubscriptionCreate.userErrors;
    if (errors.length) {
      throw new Error(`Webhook register failed: ${JSON.stringify(errors)}`);
    }
  }

  return { ok: true };
}

/**
 * Shopify GraphQL espera enum do tipo WebhookSubscriptionTopic
 * Ex: "APP_UNINSTALLED"
 */
function topicToGraphQLEnum(topic: string) {
  // você pode expandir conforme for adicionando
  switch (topic) {
    case "app/uninstalled":
      return "APP_UNINSTALLED";
    default:
      // fallback simples: app/uninstalled -> APP_UNINSTALLED
      return topic.toUpperCase().replace(/\//g, "_").replace(/\./g, "_");
  }
}
