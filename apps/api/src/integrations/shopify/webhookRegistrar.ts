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

export async function ensureCoreWebhooks({
  client,
  callbackBaseUrl,
}: EnsureWebhooksArgs): Promise<void> {
  const callbackUrl = `${callbackBaseUrl}/shopify/webhooks`;

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

  // TS strict + produção: se não vier data, falha com mensagem clara.
  if (!response || !("data" in response) || !response.data) {
    throw new Error("Shopify GraphQL returned no data for webhooks query");
  }

  const topics = new Set(
    response.data.webhooks.edges.map(
      (edge: WebhooksQueryResponse["webhooks"]["edges"][number]) =>
        edge.node.topic
    )
  );

  if (!topics.has("APP_UNINSTALLED")) {
    const createRes = await client.graphql<{
      webhookSubscriptionCreate: {
        userErrors: { field: string[] | null; message: string }[];
        webhookSubscription: { id: string } | null;
      };
    }>(`
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

    if (!createRes || !("data" in createRes) || !createRes.data) {
      throw new Error("Shopify GraphQL returned no data for webhook create mutation");
    }

    const errs = createRes.data.webhookSubscriptionCreate.userErrors ?? [];
    if (errs.length > 0) {
      throw new Error(
        `Shopify webhook create failed: ${errs.map((e) => e.message).join("; ")}`
      );
    }
  }
}
