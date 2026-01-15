import { FastifyPluginAsync } from "fastify";
import { verifyWebhookHmac } from "../integrations/shopify/oauth";
import { insertWebhookEventIfNew } from "../integrations/shopify/webhookStore";

export const shopifyWebhooksRoutes: FastifyPluginAsync = async (app) => {
  // Parser como BUFFER para preservar raw body (não pode perder um byte).
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    async (_req, body) => body
  );

  app.post("/shopify/webhooks", async (request, reply) => {
    const secret = process.env.SHOPIFY_CLIENT_SECRET;
    if (!secret) {
      return reply.code(500).send({ ok: false, error: "Missing SHOPIFY_CLIENT_SECRET" });
    }

    const headers = request.headers;

    const shop = String(headers["x-shopify-shop-domain"] || "");
    const topic = String(headers["x-shopify-topic"] || "");
    const webhookId = String(headers["x-shopify-webhook-id"] || "");
    const apiVersion = String(headers["x-shopify-api-version"] || "") || null;

    const hmacHeader = String(headers["x-shopify-hmac-sha256"] || "");

    const bodyBuf = request.body as Buffer;
    const rawBody = Buffer.isBuffer(bodyBuf) ? bodyBuf.toString("utf8") : "";

    if (!shop || !topic || !webhookId) {
      return reply.code(400).send({ ok: false, error: "Missing required webhook headers (shop/topic/webhook-id)" });
    }

    const valid = verifyWebhookHmac({
      rawBody,
      hmacHeader,
      clientSecret: secret,
    });

    if (!valid) {
      return reply.code(401).send({ ok: false, error: "Invalid webhook HMAC" });
    }

    let payloadJson: unknown = null;
    try {
      payloadJson = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      payloadJson = null;
    }

    const insertedRes = await insertWebhookEventIfNew({
      webhookId,
      shop,
      topic,
      apiVersion,
      payloadJson,
      payloadRaw: rawBody,
      headersJson: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, v])),
    });

    return reply.send({
      ok: true,
      inserted: insertedRes.inserted,
      shop,
      topic,
      webhookId,
    });
  });
};
