import type { FastifyInstance } from "fastify";
import { ShopifyAdminClient } from "../integrations/shopify/adminClient";

export async function shopifyWebhooksDebugRoutes(app: FastifyInstance) {
  app.get("/__debug/webhooks/list", async (req, reply) => {
    if (!req.shopContext) {
      return reply.code(401).send({ ok: false, error: "No shop context" });
    }

    const client = new ShopifyAdminClient({
      shop: req.shopContext.shop,
      accessToken: req.shopContext.accessToken,
    });

    const data = await client.graphql<{
      webhookSubscriptions: {
        edges: Array<{
          node: {
            id: string;
            topic: string;
            endpoint: any;
          };
        }>;
      };
    }>(`
      query {
        webhookSubscriptions(first: 50) {
          edges {
            node {
              id
              topic
              endpoint {
                __typename
                ... on WebhookHttpEndpoint { callbackUrl }
              }
            }
          }
        }
      }
    `);

    const list = data.webhookSubscriptions.edges.map((e) => ({
      id: e.node.id,
      topic: e.node.topic,
      callbackUrl: e.node.endpoint?.callbackUrl ?? null,
    }));

    return reply.send({ ok: true, count: list.length, list });
  });
}
