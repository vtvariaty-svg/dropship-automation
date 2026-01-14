import { FastifyInstance } from "fastify";
import { env } from "../env";
import { normalizeShop, verifyWebhookHmac } from "../integrations/shopify/oauth";
import { insertWebhookEventIfNew } from "../integrations/shopify/webhookStore";

export async function shopifyWebhooksRoutes(app: FastifyInstance) {
  // IMPORTANTÍSSIMO: pegar RAW body
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => done(null, body)
  );

  app.post("/shopify/webhooks", async (req, reply) => {
    const headers = req.headers as Record<string, any>;

    const shop = normalizeShop(headers["x-shopify-shop-domain"] ?? "");
    const topic = String(headers["x-shopify-topic"] ?? "");
    const webhookId = String(headers["x-shopify-webhook-id"] ?? "");
    const hmac = String(headers["x-shopify-hmac-sha256"] ?? "");
    const apiVersion = headers["x-shopify-api-version"] ? String(headers["x-shopify-api-version"]) : null;

    const rawBody = typeof req.body === "string" ? req.body : "";

    if (!shop || !topic || !webhookId) {
      return reply.code(400).send({
        ok: false,
        error: "Missing required webhook headers (shop/topic/webhook-id)",
      });
    }

    const okHmac = verifyWebhookHmac(rawBody, hmac, env.SHOPIFY_CLIENT_SECRET);
    if (!okHmac) {
      return reply.code(401).send({ ok: false, error: "Invalid webhook HMAC" });
    }

    const payloadJson = rawBody ? safeJsonParse(rawBody) : null;

    const insertedRes = await insertWebhookEventIfNew({
      webhookId,
      shop,
      topic,
      apiVersion,
      payloadJson,
      payloadRaw: rawBody,
      headersJson: headers,
    });

    return reply.send({
      ok: true,
      inserted: insertedRes.inserted,
      shop,
      topic,
      webhookId,
    });
  });
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return { _raw: raw };
  }
}
