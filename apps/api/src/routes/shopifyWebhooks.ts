import type { FastifyInstance } from "fastify";
import { verifyShopifyWebhookHmac } from "../integrations/shopify/webhooks";
import { insertWebhookEventIfNew } from "../integrations/shopify/webhookStore";
import { ShopifyAdminClient } from "../integrations/shopify/adminClient";

export async function shopifyWebhookRoutes(app: FastifyInstance) {
  /**
   * ✅ DEBUG: lista webhooks cadastrados na Shopify (Admin API)
   * Use: GET /__debug/webhooks/list?shop=xxx.myshopify.com
   */
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
   * Use: POST /__debug/webhooks/ingest?shop=xxx.myshopify.com
   */
  app.post("/__debug/webhooks/ingest", async (req, reply) => {
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

  /**
   * ✅ PROD: receiver oficial Shopify
   * POST /shopify/webhooks
   */
  app.post("/shopify/webhooks", async (req, reply) => {
    const shop = String(req.headers["x-shopify-shop-domain"] ?? "").trim().toLowerCase();
    const topic = String(req.headers["x-shopify-topic"] ?? "").trim();
    const webhookId = String(req.headers["x-shopify-webhook-id"] ?? "").trim();
    const apiVersion = String(req.headers["x-shopify-api-version"] ?? "").trim() || null;

    const hmacHeader = String(req.headers["x-shopify-hmac-sha256"] ?? "").trim() || undefined;

    const rawBody = String((req as any).rawBody ?? "");

    if (!shop || !topic || !webhookId) {
      return reply.code(400).send({
        ok: false,
        error: "Missing required webhook headers (shop/topic/webhook-id).",
      });
    }

    const okHmac = verifyShopifyWebhookHmac({ rawBody, hmacHeader });
    if (!okHmac) {
      return reply.code(401).send({ ok: false, error: "Invalid webhook HMAC" });
    }

    const payloadJson = req.body ?? {};

    const headersJson: Record<string, unknown> = {
      "x-shopify-topic": topic,
      "x-shopify-shop-domain": shop,
      "x-shopify-webhook-id": webhookId,
      "x-shopify-api-version": apiVersion,
      "user-agent": req.headers["user-agent"] ?? null,
    };

    const { inserted } = await insertWebhookEventIfNew({
      webhookId,
      shop,
      topic,
      apiVersion,
      payloadJson,
      payloadRaw: rawBody,
      headersJson,
    });

    return reply.code(200).send({
      ok: true,
      inserted,
      shop,
      topic,
      webhookId,
    });
  });
}
