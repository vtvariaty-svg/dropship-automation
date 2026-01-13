import { ShopifyAdminClient } from "./adminClient";

const WEBHOOK_CALLBACK_URL =
  "https://cliquebuy-automation-api.onrender.com/shopify/webhooks";

type WebhookTopic =
  | "ORDERS_CREATE"
  | "ORDERS_PAID"
  | "APP_UNINSTALLED";

const TOPIC_MAP: Record<WebhookTopic, string> = {
  ORDERS_CREATE: "ORDERS_CREATE",
  ORDERS_PAID: "ORDERS_PAID",
  APP_UNINSTALLED: "APP_UNINSTALLED",
};

export async function ensureWebhooks(client: ShopifyAdminClient) {
  const query = `
    query {
      webhookSubscriptions(first: 100) {
        edges {
          node {
            id
            topic
            endpoint {
              __typename
              ... on WebhookHttpEndpoint {
                callbackUrl
              }
            }
          }
        }
      }
    }
  `;

  const existing = await client.graphql<any>(query);

  const existingSet = new Set(
    existing.webhookSubscriptions.edges.map(
      (e: any) => `${e.node.topic}:${e.node.endpoint.callbackUrl}`
    )
  );

  const mutations: Array<{ topic: string }> = [
    { topic: "ORDERS_CREATE" },
    { topic: "ORDERS_PAID" },
    { topic: "APP_UNINSTALLED" },
  ];

  for (const { topic } of mutations) {
    const key = `${topic}:${WEBHOOK_CALLBACK_URL}`;
    if (existingSet.has(key)) continue;

    const mutation = `
      mutation {
        webhookSubscriptionCreate(
          topic: ${topic},
          webhookSubscription: {
            callbackUrl: "${WEBHOOK_CALLBACK_URL}",
            format: JSON
          }
        ) {
          webhookSubscription {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    await client.graphql<any>(mutation);
  }
}
