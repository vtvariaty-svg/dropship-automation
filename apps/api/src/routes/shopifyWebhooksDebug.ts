import type { FastifyInstance } from "fastify";
import { ShopifyAdminClient } from "../integrations/shopify/adminClient";
import { insertWebhookEventIfNew } from "../integrations/shopify/webhookStore";

export async function shopifyWebhooksDebugRoutes(app: FastifyInstance) {
  /**
   * ✅ DEBUG: lista webhooks cadastrados na Shopify (Admin API)
   * Use: GET /_debug/webhooks/list?shop=xxx.myshopify.com
   */
  app.get("/_debug/webhooks/list", async (req, reply) => {
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
            endpoint: { __typename: string; callbackUrl?: string | null };
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
      callbackUrl: (e.node.endpoint as any)?.callbackUrl ?? null,
    }));

    return reply.send({ ok: true, count: list.length, list });
  });

  /**
   * ✅ DEBUG: grava um evento fake no Neon (prova insert + tabela ok)
   * Use: POST /_debug/webhooks/ingest?shop=xxx.myshopify.com
   */
  app.post("/_debug/webhooks/ingest", async (req, reply) => {
    const shopRaw =
      (req.query as any)?.shop ?? (req.headers["x-shopify-shop-domain"] as string | undefined);

    const shop = String(shopRaw ?? "").trim().toLowerCase();
    if (!shop) return reply.code(400).send({ ok: false, error: "Missing shop" });

    const rawBody = String((req as any).rawBody ?? JSON.stringify(req.body ?? {}));
    const payloadJson = req.body ?? {};

    const { inserted } = await insertWebhookEventIfNew({
      webhookId: `debug-${Date.now()}`,
      shop,
      topic: "debug/test",
      apiVersion: null,
      payloadJson,
      payloadRaw: rawBody,
      headersJson: { debug: true },
    });

    return reply.send({ ok: true, inserted });
  });
}
