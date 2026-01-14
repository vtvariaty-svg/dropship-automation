import type { FastifyInstance } from "fastify";
import { verifyShopifyWebhookHmac } from "../integrations/shopify/webhooks";
import { insertWebhookEventIfNew } from "../integrations/shopify/webhookStore";

export async function shopifyWebhookRoutes(app: FastifyInstance) {
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
