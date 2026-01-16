// apps/api/src/integrations/shopify/webhookRegistrar.ts
import { ShopifyAdminClient } from "./adminClient";

type EnsureWebhooksArgs = {
  client: ShopifyAdminClient;
  callbackBaseUrl: string;
};

type WebhooksQueryResponse = {
  webhooks: {
    edges: {
      node: {
        id: string;
        topic: string;
        endpoint: {
          __typename: string;
        };
      };
    }[];
  };
};

/**
 * Registra webhooks essenciais do app.
 * - Idempotente
 * - Seguro para chamar em todo install
 */
export async function ensureCoreWebhooks({
  client,
  callbackBaseUrl,
}: EnsureWebhooksArgs): Promise<void> {
  const callbackUrl = `${callbackBaseUrl}/shopify/webhooks`;

  // 1️⃣ Buscar webhooks existentes
  const response = await client.graphql<WebhooksQueryResponse>(`
    query {
      webhooks(first: 100) {
        edges {
          node {
            id
            topic
            endpoint {
              __typename
            }
          }
        }
      }
    }
  `);

  const topics = new Set(
    response.data.webhooks.edges.map(
      (edge: WebhooksQueryResponse["webhooks"]["edges"][number]) =>
        edge.node.topic
    )
  );

  // 2️⃣ Garantir app/uninstalled
  if (!topics.has("APP_UNINSTALLED")) {
    await client.graphql(`
      mutation {
        webhookSubscriptionCreate(
          topic: APP_UNINSTALLED
          webhookSubscription: {
            callbackUrl: "${callbackUrl}"
            format: JSON
          }
        ) {
          userErrors {
            field
            message
          }
          webhookSubscription {
            id
          }
        }
      }
    `);
  }
}
